"""Validate published A2A error details with the official Protobuf decoder."""

import argparse
import json
from pathlib import Path

from google.protobuf import any_pb2, json_format, struct_pb2
from google.rpc import error_details_pb2  # Registers ErrorInfo and BadRequest descriptors.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec-dir", type=Path, default=Path(__file__).resolve().parents[1] / "spec/latest")
    args = parser.parse_args()
    files = sorted((args.spec_dir / "examples").glob("error*.jsonrpc.example.json"))
    if not files:
        raise ValueError("No error fixtures found")

    details = payloads = 0
    for file in files:
        envelope = json.loads(file.read_text())
        for index, detail in enumerate(envelope["error"]["data"]):
            try:
                message = json_format.ParseDict(detail, any_pb2.Any())
                if json_format.MessageToDict(message) != detail:
                    raise ValueError("ProtoJSON round trip changed the detail")
                if message.Is(struct_pb2.Struct.DESCRIPTOR):
                    payload = struct_pb2.Struct()
                    if not message.Unpack(payload):
                        raise ValueError("Cannot unpack Struct")
                    if json_format.MessageToDict(payload).get("type") == "aap.error":
                        payloads += 1
                details += 1
            except (json_format.ParseError, ValueError) as error:
                raise ValueError(f"{file.name}: error.data[{index}]: {error}") from error

    if payloads == 0:
        raise ValueError("No typed AAP Struct payloads were verified")
    print(f"ProtoJSON valid: {len(files)} error fixtures, {details} Any details, {payloads} AAP payloads")


if __name__ == "__main__":
    main()
