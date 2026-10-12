"""Build both pinned model derivatives, or publish them as a maintainer.

Build needs numpy==2.3.5; publish additionally needs huggingface_hub.
Users install models through the Rust CLI without Python.
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import struct
import tempfile
import urllib.request
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
FILES = ("model.safetensors", "tokenizer.json", "config.json")
SOURCES = {
    "code": {
        "id": "minishlab/potion-code-16M-v2",
        "revision": "e9d2a44ca6a05ac6685f3b23709ea57eb7352d5b",
        "files": [
            {
                "name": "model.safetensors",
                "bytes": 32490072,
                "sha256": "75cf7a6c2171b230ad19b1e7d8e0b1aee86da5a02af8e7cacedd9921d227623c",
            },
            {
                "name": "tokenizer.json",
                "bytes": 1024340,
                "sha256": "107bbdcbad4bff1d299b7a4c3a2fb17c52890688b7dd0e4c9deab79d3c4f3d45",
            },
            {
                "name": "config.json",
                "bytes": 59,
                "sha256": "148e5691a6fcc553437156859701fba017a1ba5d340b170f17e0f3668fb861a7",
            },
            {
                "name": "README.md",
                "bytes": 5301,
                "sha256": "835e4161a3942cd5284d423dbdb4ca69024b671436273142d7512153e770794c",
            },
        ],
    },
    "documents": {
        "id": "minishlab/potion-retrieval-32M",
        "revision": "6fc8051fab2a1e0ee76689cf08c853792ac285e7",
        "files": [
            {
                "name": "model.safetensors",
                "bytes": 129210456,
                "sha256": "07609e5bd33aad37900b3fd62f4ec96f6daec88ca4d46b9d8b928bfababf6ea0",
            },
            {
                "name": "tokenizer.json",
                "bytes": 1493150,
                "sha256": "7d75cbc54318138807c401b0f0c9721117c628b39de8e8e0edb6cb17e0ee7d18",
            },
            {
                "name": "config.json",
                "bytes": 202,
                "sha256": "63c00d90824c832c04ec1d02b6a983fb90489bf049f29fbff15ba481b8a432ee",
            },
            {
                "name": "README.md",
                "bytes": 17141,
                "sha256": "dd46f9828de776831d173b39b3dfb5ee9b8e5cb756daa3739afab1ab5d6542fd",
            },
        ],
    },
}

DTYPES = {
    "F32": np.dtype("<f4"),
    "F16": np.dtype("<f2"),
    "F64": np.dtype("<f8"),
    "I8": np.dtype("i1"),
}


def read_tensors(path):
    raw = path.read_bytes()
    size = struct.unpack("<Q", raw[:8])[0]
    if size > len(raw) - 8:
        raise ValueError("Invalid safetensors header")
    header = json.loads(raw[8 : 8 + size])
    payload = memoryview(raw)[8 + size :]
    rows = {}
    for name, info in header.items():
        if name == "__metadata__":
            continue
        dtype = DTYPES[info["dtype"]]
        start, end = info["data_offsets"]
        if (
            not 0 <= start <= end <= len(payload)
            or end - start != int(np.prod(info["shape"])) * dtype.itemsize
        ):
            raise ValueError("Invalid tensor offsets or shape")
        rows[name] = (
            np.frombuffer(payload[start:end], dtype=dtype).reshape(info["shape"]).copy()
        )
    return rows


def write_tensors(path, tensors):
    header = {}
    payload = []
    offset = 0
    reverse = {v.str: k for k, v in DTYPES.items()}
    for name, array in tensors.items():
        array = np.ascontiguousarray(array)
        data = array.tobytes()
        header[name] = {
            "dtype": reverse[array.dtype.str],
            "shape": list(array.shape),
            "data_offsets": [offset, offset + len(data)],
        }
        offset += len(data)
        payload.append(data)
    encoded = json.dumps(header, separators=(",", ":")).encode()
    encoded += b" " * ((-len(encoded)) % 8)
    with path.open("xb") as stream:
        stream.write(struct.pack("<Q", len(encoded)))
        stream.write(encoded)
        for data in payload:
            stream.write(data)


def quantized_rows(embeddings, weights=None):
    if embeddings.ndim != 2 or not np.isfinite(embeddings).all():
        raise ValueError("Invalid embeddings")
    source = embeddings.astype(np.float32)
    scales = np.max(np.abs(source), axis=1) / 127
    scales = np.where(scales > 0, scales, 1).astype(np.float32)
    packed = np.rint(source / scales[:, None]).clip(-127, 127).astype(np.int8)
    if weights is not None:
        if weights.shape != (len(source),) or not np.isfinite(weights).all():
            raise ValueError("Invalid weights")
        scales *= weights.astype(np.float32)
    return packed, scales


def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def runtime_specs():
    """Read the installer table so publication and runtime share one identity."""
    text = (ROOT / "crates/ixos-core/src/model/install.rs").read_text()
    specs = {}
    pattern = r'ModelSpec \{\s*profile: Profile::(Code|Documents),\s*repository: "([^"]+)",\s*revision: "([^"]+)",\s*hashes: \[([^]]+)'
    for profile, repository, revision, hashes in re.findall(pattern, text):
        specs[profile.lower()] = dict(
            repository=repository,
            revision=revision,
            hashes=re.findall(r'"([a-f0-9]{64})"', hashes),
        )
    if set(specs) != set(SOURCES):
        raise ValueError("Cannot read the two Rust model specifications")
    return specs


def verify(folder, spec):
    for name, expected in zip(FILES, spec["hashes"], strict=True):
        if sha(folder / name) != expected:
            raise ValueError(f"Model checksum mismatch: {folder / name}")


def build(destination, source_root):
    destination.mkdir(parents=True, exist_ok=True)
    specs = runtime_specs()
    for profile, source_spec in SOURCES.items():
        target = destination / profile
        if target.exists():
            verify(target, specs[profile])
            print(f"Already built: {target}")
            continue
        with tempfile.TemporaryDirectory(
            dir=destination, prefix=".ixos-model-"
        ) as temporary:
            work = Path(temporary)
            source = work / "source"
            source.mkdir()
            for item in source_spec["files"]:
                name = item["name"]
                path = source / name
                if source_root:
                    shutil.copyfile(
                        source_root / source_spec["id"].split("/")[-1] / name, path
                    )
                else:
                    url = f"https://huggingface.co/{source_spec['id']}/resolve/{source_spec['revision']}/{name}"
                    with urllib.request.urlopen(
                        url, timeout=120
                    ) as response, path.open("xb") as output:
                        count = 0
                        while chunk := response.read(1024 * 1024):
                            count += len(chunk)
                            if count > item["bytes"]:
                                raise ValueError("Download exceeds pinned size")
                            output.write(chunk)
                if path.stat().st_size != item["bytes"] or sha(path) != item["sha256"]:
                    raise ValueError(f"Pinned upstream size/hash differs: {name}")
            output = work / "prepared"
            output.mkdir()
            if profile == "code":
                for name in ("model.safetensors", "config.json"):
                    shutil.copyfile(source / name, output / name)
                tokenizer = json.loads(
                    (source / "tokenizer.json").read_text(encoding="utf-8")
                )
                tokenizer.update(truncation=None, padding=None)
                (output / "tokenizer.json").write_text(
                    json.dumps(tokenizer, ensure_ascii=False, separators=(",", ":")),
                    encoding="utf-8",
                    newline="",
                )
            else:
                tensors = read_tensors(source / "model.safetensors")
                if set(tensors) - {"embeddings", "weights"}:
                    raise ValueError("Unsupported model tensors")
                packed, scales = quantized_rows(
                    tensors["embeddings"], tensors.get("weights")
                )
                write_tensors(
                    output / "model.safetensors",
                    {"embeddings": packed, "weights": scales},
                )
                for name in ("tokenizer.json", "config.json"):
                    shutil.copyfile(source / name, output / name)
            shutil.copyfile(source / "README.md", output / "UPSTREAM_MODEL_CARD.md")
            shutil.copyfile(ROOT / f"docs/models/{profile}.md", output / "README.md")
            verify(output, specs[profile])
            output.rename(target)
            print(f"Built and verified: {target}")


def publish(destination):
    from huggingface_hub import HfApi

    specs = runtime_specs()
    for profile, spec in specs.items():
        verify(destination / profile, spec)
        if spec["repository"].startswith("PABLO_HF_USER"):
            raise ValueError(
                "Confirm repository IDs in the Rust installer table before publishing"
            )
    api = HfApi()
    for profile, spec in specs.items():
        api.create_repo(spec["repository"], repo_type="model", exist_ok=True)
        published = api.upload_folder(
            repo_id=spec["repository"],
            folder_path=destination / profile,
            allow_patterns=[*FILES, "README.md", "UPSTREAM_MODEL_CARD.md"],
        )
        print(f"Published {profile}: {published}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    build_args = commands.add_parser("build", help="Recreate both pinned models")
    build_args.add_argument(
        "--source-root", type=Path, help="Offline pinned upstream folders"
    )
    build_args.add_argument("--destination", type=Path, default=ROOT / "models")
    publish_args = commands.add_parser(
        "publish", help="Upload verified models and attribution"
    )
    publish_args.add_argument("--destination", type=Path, default=ROOT / "models")
    args = parser.parse_args()
    if args.command == "build":
        build(args.destination, args.source_root)
    else:
        publish(args.destination)


if __name__ == "__main__":
    main()
