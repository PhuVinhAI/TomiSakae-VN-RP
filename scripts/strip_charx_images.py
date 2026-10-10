#!/usr/bin/env python3
"""Extract, validate, and repack CharX files for AI-assisted text editing.

Commands:
  extract  CharX -> clean raw ZIP with a first-read skill, card.json, and decoded module.json
  validate Validate an AI-edited raw ZIP
  pack     raw ZIP -> CharX, optionally restoring images from the original

For a quick extract, the command name may be omitted:
  python scripts/strip_charx_images.py "C:\\path\\card.charx"
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import struct
import sys
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any, Dict, List, Optional, Tuple


RAW_FORMAT = "tomi-sakae-charx-raw-v1"
RAW_SKILL_NAME = "README.md"
CHANGE_REPORT_NAME = "CHARX-EDIT-REPORT.md"
SKILL_SOURCE = Path(__file__).resolve().parents[1] / "skills" / "charx-workbench" / RAW_SKILL_NAME
IMAGE_EXTENSIONS = {
    ".apng", ".avif", ".bmp", ".gif", ".ico", ".jpeg", ".jpg", ".png", ".svg", ".webp"
}
IMAGE_EXTENSION_NAMES = {value.lstrip(".") for value in IMAGE_EXTENSIONS}
DEFAULT_RPACK_MAPS = (
    Path(r"C:\Users\tomis\TaiLieu\PocketRisu\src\ts\rpack\rpack_map.bin"),
    Path("PocketRisu/src/ts/rpack/rpack_map.bin"),
)


def read_skill_bytes() -> bytes:
    """Load the handoff instructions that must travel with every raw ZIP."""
    if not SKILL_SOURCE.is_file():
        raise FileNotFoundError("CharX skill file not found: " + str(SKILL_SOURCE))
    data = SKILL_SOURCE.read_bytes()
    if not data.strip():
        raise ValueError("CharX skill file is empty: " + str(SKILL_SOURCE))
    return data


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def report_template(source_name: str) -> bytes:
    return (
        f"# Báo cáo chỉnh sửa CharX\n\n"
        f"- Gói nguồn: `{source_name}`\n"
        "- Trạng thái: Hãy điền báo cáo sau khi phân tích và chỉnh sửa ZIP.\n\n"
        "## Phân tích\n\n"
        "## Tệp và trường đã thay đổi\n\n"
        "## Tệp và định dạng được giữ nguyên\n\n"
        "## Kiểm tra đã chạy\n\n"
        "## Vấn đề chưa xử lý\n"
    ).encode("utf-8")


def is_image_entry(name: str) -> bool:
    path = PurePosixPath(name)
    if path.name.startswith("."):
        return False
    if "assets" in path.parts and "image" in path.parts:
        return True
    return path.suffix.lower() in IMAGE_EXTENSIONS and not name.startswith("x_meta/")


def find_rpack_map(explicit: Optional[Path]) -> Optional[Path]:
    candidates: List[Path] = []
    if explicit is not None:
        candidates.append(explicit)
    env_path = os.environ.get("POCKETRISU_RPACK_MAP")
    if env_path:
        candidates.append(Path(env_path))
    candidates.extend(DEFAULT_RPACK_MAPS)
    project_root = Path(__file__).resolve().parents[1]
    candidates.append(project_root.parent / "PocketRisu/src/ts/rpack/rpack_map.bin")
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def rpack_maps(map_path: Path) -> Tuple[bytes, bytes]:
    data = map_path.read_bytes()
    if len(data) < 512:
        raise ValueError("rpack_map.bin is shorter than 512 bytes")
    return data[:256], data[256:512]


def decode_rpack(data: bytes, map_path: Path) -> bytes:
    _, decode_map = rpack_maps(map_path)
    return bytes(decode_map[value] for value in data)


def encode_rpack(data: bytes, map_path: Path) -> bytes:
    encode_map, _ = rpack_maps(map_path)
    return bytes(encode_map[value] for value in data)


def parse_risum(data: bytes, map_path: Path) -> Tuple[Dict[str, Any], List[bytes]]:
    if len(data) < 6 or data[0] != 111 or data[1] != 0:
        raise ValueError("module.risum has an unknown header or version")
    main_length = struct.unpack_from("<I", data, 2)[0]
    main_start = 6
    main_end = main_start + main_length
    if main_end > len(data):
        raise ValueError("module.risum declares data beyond the end of the file")
    main_bytes = decode_rpack(data[main_start:main_end], map_path)
    try:
        wrapper = json.loads(main_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("module.risum main block is not UTF-8 JSON") from error
    if not isinstance(wrapper, dict) or wrapper.get("type") != "risuModule":
        raise ValueError("module.risum does not contain a risuModule wrapper")

    assets: List[bytes] = []
    position = main_end
    while position < len(data):
        marker = data[position]
        position += 1
        if marker == 0:
            break
        if marker != 1 or position + 4 > len(data):
            raise ValueError("module.risum contains an invalid asset block")
        length = struct.unpack_from("<I", data, position)[0]
        position += 4
        end = position + length
        if end > len(data):
            raise ValueError("module.risum asset block exceeds the file length")
        assets.append(data[position:end])
        position = end
    return wrapper, assets


def build_risum(wrapper: Dict[str, Any], encoded_assets: List[bytes], map_path: Path) -> bytes:
    main = encode_rpack(
        json.dumps(wrapper, ensure_ascii=False, indent=2).encode("utf-8"), map_path
    )
    output = bytearray([111, 0])
    output.extend(struct.pack("<I", len(main)))
    output.extend(main)
    for asset in encoded_assets:
        output.append(1)
        output.extend(struct.pack("<I", len(asset)))
        output.extend(asset)
    output.append(0)
    return bytes(output)


def read_card_image_manifest(card_bytes: bytes) -> List[Dict[str, Any]]:
    try:
        card = json.loads(card_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return []
    data = card.get("data", {}) if isinstance(card, dict) else {}
    assets = data.get("assets", []) if isinstance(data, dict) else []
    if not isinstance(assets, list):
        return []
    result: List[Dict[str, Any]] = []
    for index, asset in enumerate(assets):
        if not isinstance(asset, dict):
            continue
        extension = str(asset.get("ext", "")).lower()
        if extension not in IMAGE_EXTENSION_NAMES:
            continue
        result.append({
            "index": index,
            "name": asset.get("name", ""),
            "ext": asset.get("ext", ""),
            "type": asset.get("type", ""),
            "uri": asset.get("uri", ""),
        })
    return result


def read_card_name_from_archive(source: Path) -> Optional[str]:
    """Read the display name from card.json for generated filenames."""
    try:
        with zipfile.ZipFile(source, "r") as archive:
            names = archive.namelist()
            card_path = "card.json"
            if card_path not in names:
                matches = [name for name in names if name.endswith("/card.json")]
                if len(matches) != 1:
                    return None
                card_path = matches[0]
            card = json.loads(archive.read(card_path).decode("utf-8"))
    except (OSError, zipfile.BadZipFile, UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(card, dict):
        return None
    data = card.get("data")
    if isinstance(data, dict) and isinstance(data.get("name"), str) and data["name"].strip():
        return data["name"].strip()
    if isinstance(card.get("name"), str) and card["name"].strip():
        return card["name"].strip()
    return None


def safe_filename_stem(value: Optional[str], fallback: str) -> str:
    """Convert a card display name into a safe Windows filename stem."""
    stem = (value or fallback).strip()
    stem = "".join("_" if ord(char) < 32 or char in '<>:"/\\|?*' else char for char in stem)
    stem = stem.rstrip(" .") or fallback
    if stem.upper() in {"CON", "PRN", "AUX", "NUL"} or (
        len(stem) == 4 and stem[:3].upper() in {"COM", "LPT"} and stem[3].isdigit()
    ):
        stem = "_" + stem
    return stem


def default_raw_path(source: Path) -> Path:
    card_name = read_card_name_from_archive(source)
    stem = safe_filename_stem(card_name, source.stem)
    return source.with_name(stem + "-raw.zip")


def default_charx_path(raw: Path) -> Path:
    card_name = read_card_name_from_archive(raw)
    if card_name:
        stem = safe_filename_stem(card_name, raw.stem)
    else:
        stem = raw.stem[:-4] if raw.stem.endswith("-raw") else raw.stem
    return raw.with_name(stem + "-repacked.charx")


def write_json_entry(archive: zipfile.ZipFile, name: str, value: Any) -> None:
    archive.writestr(name, json.dumps(value, ensure_ascii=False, indent=2).encode("utf-8"))


def find_archive_prefix(names: List[str], required: str) -> str:
    """Return the optional single directory prefix used by an AI-made ZIP."""
    if required in names:
        return ""
    matches = [name for name in names if name.endswith("/" + required)]
    if len(matches) != 1:
        raise ValueError("Archive is missing " + required + " at its root")
    return matches[0][: -len(required)]


def prefixed_path(prefix: str, logical_name: str) -> str:
    if logical_name.startswith("/") or ".." in PurePosixPath(logical_name).parts:
        raise ValueError("Unsafe archive path: " + logical_name)
    return prefix + logical_name


def extract_raw(source: Path, output: Path, map_path: Optional[Path]) -> Tuple[int, int]:
    if not source.is_file():
        raise FileNotFoundError("Input file not found: " + str(source))
    if source.resolve() == output.resolve():
        raise ValueError("Output path must be different from the input path")
    output.parent.mkdir(parents=True, exist_ok=True)
    skill_bytes = read_skill_bytes()
    kept = 0
    removed = 0
    image_entries: List[Dict[str, Any]] = []

    with zipfile.ZipFile(source, "r") as source_zip:
        names = source_zip.namelist()
        if "card.json" not in names:
            raise ValueError("The archive does not contain card.json")
        card_bytes = source_zip.read("card.json")
        card_images = read_card_image_manifest(card_bytes)
        module_wrapper: Optional[Dict[str, Any]] = None
        module_asset_count = 0
        raw_module_kept = False
        module_decode_error: Optional[str] = None
        if "module.risum" in names:
            module_data = source_zip.read("module.risum")
            if map_path is None:
                raw_module_kept = True
                module_decode_error = "PocketRisu rpack_map.bin was not found"
            else:
                try:
                    module_wrapper, module_assets = parse_risum(module_data, map_path)
                    module_asset_count = len(module_assets)
                except ValueError as error:
                    # Keep unknown/future module formats byte-for-byte instead of
                    # making an otherwise valid CharX impossible to hand off.
                    raw_module_kept = True
                    module_decode_error = str(error)

        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as raw_zip:
            # Put the control file first in ZIP order as well as first by name.
            raw_zip.writestr(RAW_SKILL_NAME, skill_bytes)
            raw_zip.writestr(CHANGE_REPORT_NAME, report_template(source.name))
            for info in source_zip.infolist():
                name = info.filename
                if name.endswith("/") or name == "card.json":
                    continue
                if name == "module.risum" and not raw_module_kept:
                    continue
                if is_image_entry(name):
                    image_entries.append({"path": name, "size": info.file_size})
                    removed += 1
                    continue
                raw_zip.writestr(copy.copy(info), source_zip.read(name))
                kept += 1
            raw_zip.writestr("card.json", card_bytes)
            if module_wrapper is not None:
                write_json_entry(raw_zip, "module.json", module_wrapper)
            write_json_entry(raw_zip, "charx-raw.json", {
                "format": RAW_FORMAT,
                "source_charx": source.name,
                "image_entries": image_entries,
                "card_image_assets": card_images,
                "module_file": "module.json" if module_wrapper is not None else None,
                "module_raw_file": "module.risum" if raw_module_kept else None,
                "module_decode_error": module_decode_error,
                "module_asset_count": module_asset_count,
                "skill_file": RAW_SKILL_NAME,
                "skill_sha256": sha256_bytes(skill_bytes),
                "report_file": CHANGE_REPORT_NAME,
                "note": "Image bytes were removed. Names, card URIs, unknown files, and non-image assets were preserved.",
            })
            write_json_entry(raw_zip, "image-names.json", {
                "images": image_entries,
                "card_assets": card_images,
            })
    return kept, removed


def read_raw_manifest(raw_zip: zipfile.ZipFile) -> Dict[str, Any]:
    prefix = find_archive_prefix(raw_zip.namelist(), "charx-raw.json")
    try:
        manifest = json.loads(raw_zip.read(prefixed_path(prefix, "charx-raw.json")).decode("utf-8"))
    except KeyError as error:
        raise ValueError("Raw ZIP is missing charx-raw.json") from error
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError("charx-raw.json is not valid UTF-8 JSON") from error
    if not isinstance(manifest, dict) or manifest.get("format") != RAW_FORMAT:
        raise ValueError("Unsupported raw archive format")
    # Internal value used by validate/pack; it is never written back to disk.
    manifest["_archive_prefix"] = prefix
    return manifest


def validate_raw(raw: Path) -> Dict[str, int]:
    with zipfile.ZipFile(raw, "r") as raw_zip:
        if raw_zip.testzip() is not None:
            raise ValueError("Raw ZIP contains a corrupt entry")
        manifest = read_raw_manifest(raw_zip)
        prefix = str(manifest.get("_archive_prefix") or "")
        names = raw_zip.namelist()
        logical_names = {
            name[len(prefix):] if prefix and name.startswith(prefix) else name
            for name in names
            if not name.endswith("/") and (not prefix or name.startswith(prefix))
        }
        outside_prefix = [
            name for name in names
            if not name.endswith("/") and prefix and not name.startswith(prefix)
        ]
        if outside_prefix:
            raise ValueError("Raw ZIP mixes root files with its enclosing folder")
        skill_file = str(manifest.get("skill_file") or RAW_SKILL_NAME)
        if skill_file not in logical_names:
            raise ValueError("Raw ZIP is missing " + skill_file)
        skill_bytes = raw_zip.read(prefixed_path(prefix, skill_file))
        expected_skill_hash = str(manifest.get("skill_sha256") or "")
        canonical_skill = read_skill_bytes()
        if expected_skill_hash and sha256_bytes(skill_bytes) != expected_skill_hash:
            raise ValueError(skill_file + " does not match its recorded SHA-256")
        if skill_bytes != canonical_skill:
            raise ValueError(skill_file + " was edited; restore the original skill file")
        report_file = str(manifest.get("report_file") or CHANGE_REPORT_NAME)
        if report_file not in logical_names:
            raise ValueError("Raw ZIP is missing " + report_file)
        if not raw_zip.read(prefixed_path(prefix, report_file)).strip():
            raise ValueError(report_file + " is empty")
        if "card.json" not in logical_names:
            raise ValueError("Raw ZIP is missing card.json")
        try:
            card = json.loads(raw_zip.read(prefixed_path(prefix, "card.json")).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("card.json is not valid UTF-8 JSON") from error
        if not isinstance(card, dict) or not isinstance(card.get("data"), dict):
            raise ValueError("card.json is missing data")
        module_file = manifest.get("module_file")
        if module_file:
            if str(module_file) not in logical_names:
                raise ValueError("Raw ZIP is missing " + str(module_file))
            try:
                module = json.loads(raw_zip.read(prefixed_path(prefix, str(module_file))).decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as error:
                raise ValueError(str(module_file) + " is not valid UTF-8 JSON") from error
            if not isinstance(module, dict) or module.get("type") != "risuModule":
                raise ValueError(str(module_file) + " is missing the risuModule wrapper")
        module_raw_file = manifest.get("module_raw_file")
        if module_raw_file:
            if str(module_raw_file) not in logical_names:
                raise ValueError("Raw ZIP is missing " + str(module_raw_file))
            raw_zip.read(prefixed_path(prefix, str(module_raw_file)))
        unexpected_images = [name for name in logical_names if is_image_entry(name)]
        if unexpected_images:
            raise ValueError("Raw ZIP still contains image payloads: " + str(unexpected_images[:3]))
        paths = [entry.get("path") for entry in manifest.get("image_entries", [])]
        if len(paths) != len(set(paths)):
            raise ValueError("charx-raw.json contains duplicate image paths")
        return {
            "entries": len(logical_names),
            "images": len(paths),
            "card_assets": len(manifest.get("card_image_assets", [])),
            "module_assets": int(manifest.get("module_asset_count", 0)),
        }


def pack_charx(raw: Path, output: Path, images_from: Optional[Path], map_path: Optional[Path]) -> Tuple[int, int]:
    if not raw.is_file():
        raise FileNotFoundError("Raw ZIP not found: " + str(raw))
    if raw.resolve() == output.resolve():
        raise ValueError("Output path must be different from the raw ZIP")
    summary = validate_raw(raw)
    restored = 0

    with zipfile.ZipFile(raw, "r") as raw_zip:
        manifest = read_raw_manifest(raw_zip)
        prefix = str(manifest.get("_archive_prefix") or "")
        source_images: List[Tuple[zipfile.ZipInfo, bytes]] = []
        if manifest.get("image_entries") and images_from is not None:
            with zipfile.ZipFile(images_from, "r") as source_zip:
                source_names = set(source_zip.namelist())
                for entry in manifest["image_entries"]:
                    image_path = str(entry["path"])
                    source_image_path = image_path
                    if source_image_path not in source_names:
                        matches = [name for name in source_names if name.endswith("/" + image_path)]
                        if len(matches) == 1:
                            source_image_path = matches[0]
                    if source_image_path not in source_names:
                        raise ValueError("Original CharX is missing image entry: " + image_path)
                    info = source_zip.getinfo(source_image_path)
                    # Restore under the original logical path, stripping an
                    # optional directory wrapper from the source archive.
                    restored_info = copy.copy(info)
                    restored_info.filename = image_path
                    source_images.append((restored_info, source_zip.read(source_image_path)))
            restored = len(source_images)

        module_bytes: Optional[bytes] = None
        if manifest.get("module_file"):
            if map_path is None:
                raise ValueError("PocketRisu rpack_map.bin is required to rebuild module.risum")
            module_wrapper = json.loads(
                raw_zip.read(prefixed_path(prefix, str(manifest["module_file"]))).decode("utf-8")
            )
            module_asset_count = int(manifest.get("module_asset_count", 0))
            encoded_assets: List[bytes] = []
            if module_asset_count:
                if images_from is None:
                    raise ValueError("Module assets exist; pass --images-from the original CharX")
                with zipfile.ZipFile(images_from, "r") as source_zip:
                    source_module = "module.risum"
                    if source_module not in source_zip.namelist():
                        matches = [name for name in source_zip.namelist() if name.endswith("/module.risum")]
                        if len(matches) == 1:
                            source_module = matches[0]
                    if source_module not in source_zip.namelist():
                        raise ValueError("Original CharX is missing module.risum")
                    _, encoded_assets = parse_risum(source_zip.read(source_module), map_path)
                if len(encoded_assets) != module_asset_count:
                    raise ValueError("Original module asset count does not match the raw manifest")
            module_bytes = build_risum(module_wrapper, encoded_assets, map_path)

        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as out:
            for info in raw_zip.infolist():
                archive_name = info.filename
                name = archive_name[len(prefix):] if prefix and archive_name.startswith(prefix) else archive_name
                if name.endswith("/") or name in {
                    "charx-raw.json", "image-names.json", "module.json",
                    RAW_SKILL_NAME, CHANGE_REPORT_NAME
                }:
                    continue
                if prefix and not archive_name.startswith(prefix):
                    raise ValueError("Raw ZIP mixes root files with its enclosing folder")
                output_info = copy.copy(info)
                output_info.filename = name
                out.writestr(output_info, raw_zip.read(archive_name))
            if module_bytes is not None:
                out.writestr("module.risum", module_bytes)
            for info, data in source_images:
                out.writestr(info, data)

    if summary["images"] and images_from is None:
        print("Warning: packed CharX has no image payloads; card references remain metadata-only.", file=sys.stderr)
    return summary["images"], restored


def make_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Convert CharX to clean raw JSON ZIP and repack it.")
    sub = parser.add_subparsers(dest="command")
    extract = sub.add_parser("extract", help="create an AI-editable ZIP and decode module.risum when possible")
    extract.add_argument("charx", type=Path)
    extract.add_argument("-o", "--output", type=Path)
    extract.add_argument("--rpack-map", type=Path)
    validate = sub.add_parser("validate", help="validate an AI-edited raw ZIP")
    validate.add_argument("raw", type=Path)
    pack = sub.add_parser("pack", help="validate raw ZIP and create CharX")
    pack.add_argument("raw", type=Path)
    pack.add_argument("-o", "--output", type=Path)
    pack.add_argument("--images-from", type=Path, help="original CharX used to restore image bytes")
    pack.add_argument("--rpack-map", type=Path)
    return parser


def parse_args() -> argparse.Namespace:
    argv = sys.argv[1:]
    if argv and argv[0].lower() not in {"extract", "validate", "pack", "-h", "--help"}:
        argv = ["extract"] + argv
    return make_parser().parse_args(argv)


def main() -> int:
    args = parse_args()
    command = args.command
    try:
        if command == "extract":
            source = args.charx.expanduser().resolve()
            output = (args.output or default_raw_path(source)).expanduser().resolve()
            map_path = find_rpack_map(args.rpack_map.expanduser().resolve() if args.rpack_map else None)
            kept, removed = extract_raw(source, output, map_path)
            print("Created raw ZIP: " + str(output))
            print("Kept metadata entries: " + str(kept))
            print("Removed image entries: " + str(removed))
            return 0
        if command == "validate":
            raw = args.raw.expanduser().resolve()
            print("Valid raw ZIP: " + str(raw))
            print(json.dumps(validate_raw(raw), ensure_ascii=False))
            return 0
        if command == "pack":
            raw = args.raw.expanduser().resolve()
            output = (args.output or default_charx_path(raw)).expanduser().resolve()
            map_path = find_rpack_map(args.rpack_map.expanduser().resolve() if args.rpack_map else None)
            images_from = args.images_from.expanduser().resolve() if args.images_from else None
            image_count, restored = pack_charx(raw, output, images_from, map_path)
            print("Created CharX: " + str(output))
            print("Image names preserved: " + str(image_count))
            print("Image payloads restored: " + str(restored))
            return 0
        make_parser().print_help()
        return 2
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        print("Error: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
