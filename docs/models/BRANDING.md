# Brandable Model Names

Each name below maps to a concrete artifact and is stable across releases.

## Flash Quartz (ixos-flash-v4-int8-512)
Positioning: The quality-first Flash tier that keeps near-v2 relevance with a much smaller footprint.

Technical explanation: Flash Quartz is a Model2Vec distilled embedder built from st-all-mpnet-base-v2, compressed to 512 dimensions with int8 embeddings. It preserves most of Flash v2 quality while reducing disk and memory usage, making it the best default for CPU-first deployments when the model pack is available.

## Flash Ember (ixos-flash-v4-int8-192)
Positioning: The ultra-fast Flash tier for instant results on constrained CPUs.

Technical explanation: Flash Ember uses the same mpnet teacher but projects to 192 dimensions and int8 embeddings to maximize throughput. The reduced dimension keeps scoring extremely fast and minimizes storage, trading some MRR on real-corpus queries for the fastest possible latency.

## Pro Prism (flash + potion + lexical fusion)
Positioning: The Pro tier that blends multiple signals to surface the most relevant results.

Technical explanation: Pro Prism fuses Flash embeddings, Potion embeddings, and lexical match ratios with learned weights (flash=0.2697, pro=0.2672, lexical=0.4631, dir=0.0). It runs only when Pro is selected or Auto routing triggers refinement, delivering a large MRR gain while keeping latency close to Flash on CPU.

## Flash Core (ixos-flash-v1)
Positioning: The stable baseline Flash tier with tuned relevance and predictable latency.

Technical explanation: Flash Core is a float16 Model2Vec distilled embedder at 512 dimensions. It remains the current default flash model and serves as the baseline for quality comparisons in the lab leaderboard.
