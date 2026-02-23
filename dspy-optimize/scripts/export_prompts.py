"""
Export Optimized Prompts to JSON
==================================
Reads a DSPy optimized program and exports the prompts
to lib/optimized-prompts.json for the TypeScript pipeline.

Usage:
    python scripts/export_prompts.py runs/<timestamp>/program.json
"""

import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from modules import RAGGenerator


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/export_prompts.py <program_path>")
        print("Example: python scripts/export_prompts.py runs/20260222-143000/program.json")
        sys.exit(1)

    program_path = Path(sys.argv[1])
    if not program_path.exists():
        print(f"Program not found: {program_path}")
        sys.exit(1)

    # Load the raw program JSON to extract instruction and demos
    program_data = json.loads(program_path.read_text())

    # DSPy 3.x stores data under "generate.predict" key
    predict_data = program_data.get("generate.predict", {})
    signature = predict_data.get("signature", {})
    instruction = signature.get("instructions", "") if isinstance(signature, dict) else ""
    raw_demos = predict_data.get("demos", [])

    # Format demos for export
    demos = []
    for demo in raw_demos:
        if isinstance(demo, dict) and "question" in demo:
            demos.append({
                "question": demo.get("question", ""),
                "context": demo.get("context", "")[:200] + "..." if len(demo.get("context", "")) > 200 else demo.get("context", ""),
                "answer": demo.get("expected_answer", "") or demo.get("answer", ""),
            })

    # Build export format
    export = {
        "version": f"dspy-{datetime.now().strftime('%Y-%m-%d')}",
        "optimized_at": datetime.now().isoformat(),
        "optimizer": "MIPROv2",
        "model": "claude-sonnet-4-6",
        "modules": {
            "generator": {
                "signature": "RAGGeneration",
                "instruction": instruction,
                "demos": demos,
            }
        },
    }

    # Write to lib/optimized-prompts.json
    output_path = Path(__file__).parent.parent.parent / "lib" / "optimized-prompts.json"
    output_path.write_text(json.dumps(export, indent=2))
    print(f"Exported optimized prompts to: {output_path}")
    print(f"  Version: {export['version']}")
    print(f"  Demos: {len(export['modules']['generator']['demos'])}")


if __name__ == "__main__":
    main()
