#!/usr/bin/env python3
"""
Compute ML scores for leads based on OpenOutreach's trained model.

This script:
1. Reads sources.json to find CRM database paths
2. Auto-locates analytics.duckdb and campaign_*.joblib files
3. Computes ML scores for all leads with embeddings
4. Stores scores directly in outreach.db (lead_scores table)

Usage:
    python compute_scores.py

If ML files cannot be found automatically, the script will prompt for paths.
"""

import json
import os
import sys
import sqlite3
from pathlib import Path
from glob import glob
from datetime import datetime

# Check dependencies
try:
    import duckdb
    import joblib
    import numpy as np
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("\nPlease install required packages:")
    print("    pip install duckdb scikit-learn joblib numpy")
    sys.exit(1)


def find_ml_files(crm_db_path: str) -> tuple[str | None, list[str]]:
    """
    Locate analytics.duckdb and model.joblib files relative to crm.db path.

    Expected locations:
    1. Same directory as crm.db
    2. Parent directory (for assets/data/crm.db -> assets/models/)
    3. Sibling 'data' or 'models' directories
    """
    crm_dir = Path(crm_db_path).parent

    # Look for analytics.duckdb
    duckdb_candidates = [
        crm_dir / "analytics.duckdb",
        crm_dir.parent / "analytics.duckdb",
        crm_dir / "data" / "analytics.duckdb",
        crm_dir.parent / "data" / "analytics.duckdb",
    ]
    duckdb_path = next((p for p in duckdb_candidates if p.exists()), None)

    # Look for campaign model files (campaign_*.joblib or model.joblib)
    model_patterns = [
        str(crm_dir / "campaign_*.joblib"),
        str(crm_dir / "model.joblib"),
        str(crm_dir.parent / "models" / "campaign_*.joblib"),
        str(crm_dir.parent / "campaign_*.joblib"),
        str(crm_dir / "models" / "campaign_*.joblib"),
    ]
    model_paths = []
    for pattern in model_patterns:
        model_paths.extend(glob(pattern))

    return str(duckdb_path) if duckdb_path else None, model_paths


def prompt_for_file(file_type: str, source_name: str) -> str | None:
    """Prompt user to enter a file path."""
    print(f"\nCould not auto-locate {file_type} for source '{source_name}'.")
    print(f"Please enter the path to {file_type} (or press Enter to skip):")

    try:
        path = input("> ").strip()
        if path and Path(path).exists():
            return path
        elif path:
            print(f"File not found: {path}")
            return None
        return None
    except (EOFError, KeyboardInterrupt):
        return None


def init_scores_table(outreach_db_path: str):
    """Create lead_scores table if it doesn't exist."""
    conn = sqlite3.connect(outreach_db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS lead_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL,
            lead_id INTEGER NOT NULL,
            ml_score REAL NOT NULL,
            ml_label INTEGER,
            public_identifier TEXT,
            model_file TEXT,
            computed_at TEXT NOT NULL,
            UNIQUE(source_id, lead_id)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_lead_scores_source 
        ON lead_scores(source_id)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_lead_scores_score 
        ON lead_scores(source_id, ml_score DESC)
    """)
    conn.commit()
    conn.close()


def compute_scores_for_source(
    source: dict, outreach_db_path: str, duckdb_path: str, model_path: str
) -> dict:
    """Compute ML scores for a single source and store in outreach.db."""

    source_id = source["id"]
    source_name = source["name"]

    print(f"\nComputing scores for '{source_name}'...")
    print(f"  DuckDB: {duckdb_path}")
    print(f"  Model:  {model_path}")

    # Load model
    model = joblib.load(model_path)

    # Connect to DuckDB and get embeddings
    duck_conn = duckdb.connect(duckdb_path, read_only=True)
    rows = duck_conn.execute("""
        SELECT lead_id, public_identifier, embedding, label 
        FROM profile_embeddings
    """).fetchall()
    duck_conn.close()

    print(f"  Found {len(rows)} profiles with embeddings")

    # Compute scores
    scores_data = []
    computed_at = datetime.utcnow().isoformat() + "Z"

    for lead_id, pub_id, embedding, label in rows:
        emb = np.array(embedding).reshape(1, -1)
        score = float(np.clip(model.predict(emb)[0], 0.0, 1.0))
        scores_data.append(
            (
                source_id,
                lead_id,
                round(score, 6),
                label,
                pub_id,
                model_path,
                computed_at,
            )
        )

    # Store in outreach.db
    out_conn = sqlite3.connect(outreach_db_path)

    # Clear existing scores for this source
    out_conn.execute("DELETE FROM lead_scores WHERE source_id = ?", (source_id,))

    # Insert new scores
    out_conn.executemany(
        """
        INSERT INTO lead_scores 
        (source_id, lead_id, ml_score, ml_label, public_identifier, model_file, computed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """,
        scores_data,
    )

    out_conn.commit()
    out_conn.close()

    # Compute statistics
    scores = [s[2] for s in scores_data]
    qualified = sum(1 for s in scores_data if s[3] == 1)
    disqualified = sum(1 for s in scores_data if s[3] == 0)
    pending = sum(1 for s in scores_data if s[3] is None)

    print(f"  Stored {len(scores_data)} scores")
    print(f"  Score range: {min(scores):.2%} - {max(scores):.2%}")
    print(
        f"  Labels: {qualified} qualified, {disqualified} disqualified, {pending} pending"
    )

    return {
        "source_id": source_id,
        "total": len(scores_data),
        "qualified": qualified,
        "disqualified": disqualified,
        "pending": pending,
        "min_score": min(scores),
        "max_score": max(scores),
        "avg_score": sum(scores) / len(scores) if scores else 0,
    }


def main():
    # Find script location and sources.json
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    sources_file = project_dir / "data" / "sources.json"
    outreach_db_path = project_dir / "data" / "outreach.db"

    print("=" * 60)
    print("ML Score Computation for LinkedIn Outreach")
    print("=" * 60)

    if not sources_file.exists():
        print(f"\nError: sources.json not found at {sources_file}")
        sys.exit(1)

    print(f"\nSources config: {sources_file}")
    print(f"Outreach DB:    {outreach_db_path}")

    # Load sources config
    with open(sources_file) as f:
        config = json.load(f)

    sources = config.get("sources", [])
    if not sources:
        print("\nNo sources configured in sources.json")
        sys.exit(1)

    print(f"\nFound {len(sources)} source(s)")

    # Initialize scores table
    init_scores_table(str(outreach_db_path))

    # Process each source
    results = []

    for source in sources:
        source_id = source["id"]
        source_name = source["name"]
        crm_path = source["path"]

        print(f"\n{'=' * 60}")
        print(f"Source: {source_name} ({source_id})")
        print(f"CRM DB: {crm_path}")

        if not Path(crm_path).exists():
            print(f"  WARNING: CRM database not found at {crm_path}")
            continue

        # Check for explicit ML file paths in source config
        ml_config = source.get("mlFiles", {})
        duckdb_path = ml_config.get("duckdb")
        model_path = ml_config.get("model")

        # Auto-locate if not specified
        if not duckdb_path or not model_path:
            auto_duckdb, auto_models = find_ml_files(crm_path)

            if not duckdb_path:
                duckdb_path = auto_duckdb
            if not model_path and auto_models:
                model_path = auto_models[0]  # Use first found

        # Prompt if still missing
        if not duckdb_path:
            duckdb_path = prompt_for_file("analytics.duckdb", source_name)
        if not model_path:
            model_path = prompt_for_file("campaign model (.joblib)", source_name)

        # Skip if files not available
        if not duckdb_path or not model_path:
            print(f"  SKIPPED: Missing ML files")
            results.append(
                {
                    "source_id": source_id,
                    "status": "skipped",
                    "reason": "Missing ML files",
                }
            )
            continue

        # Verify files exist
        if not Path(duckdb_path).exists():
            print(f"  ERROR: DuckDB file not found: {duckdb_path}")
            continue
        if not Path(model_path).exists():
            print(f"  ERROR: Model file not found: {model_path}")
            continue

        # Compute scores
        try:
            result = compute_scores_for_source(
                source, str(outreach_db_path), duckdb_path, model_path
            )
            result["status"] = "success"
            results.append(result)
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({"source_id": source_id, "status": "error", "error": str(e)})

    # Summary
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print("=" * 60)

    for result in results:
        source_id = result["source_id"]
        status = result["status"]

        if status == "success":
            print(
                f"  {source_id}: {result['total']} scores computed "
                f"(avg: {result['avg_score']:.1%})"
            )
        elif status == "skipped":
            print(f"  {source_id}: SKIPPED - {result.get('reason', 'Unknown')}")
        else:
            print(f"  {source_id}: ERROR - {result.get('error', 'Unknown')}")

    print("\nDone!")


if __name__ == "__main__":
    main()
