"""Real model coverage and batch invariance, separate from relevance evaluation."""
import argparse
import json
from pathlib import Path
import numpy as np
from eval.bridge import EmbedBridge


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary',type=Path,default=Path('target/release/ixos-lab-embed.exe'))
    parser.add_argument('--model',type=Path,action='append',required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists():parser.error('Use a new output directory')
    args.output.mkdir(parents=True)
    results=[]
    for model in args.model:
        folder=args.output/model.name
        folder.mkdir()
        with EmbedBridge(args.binary,model,folder) as bridge:
            if any(bridge.identity['tokenizer_settings'].values()):raise ValueError('Coverage/invariance checks require disabled tokenizer clipping/padding')
            short='Invalidate stored document vectors after an equal-length source edit.'
            long='compiler module asynchronous worker queue registry '*1400+' chemistry catalyst glucose reaction cell membrane '*1400
            single=bridge.embed([short])[0]
            batched=bridge.embed([short,long])[0]
            np.testing.assert_allclose(single,batched,rtol=1e-5,atol=1e-6)
            full=bridge.embed([long])[0]
            clipped=bridge.embed([long],512)[0]
            distance=float(np.linalg.norm(full-clipped))
            if distance<.05:raise ValueError('Tail-topic probe did not distinguish full input from prefix')
            results.append({'model':model.name,'artifact':bridge.identity,'batch_max_abs_difference':float(np.max(np.abs(single-batched))),'full_vs_prefix_l2':distance,'status':'passed','scope':'Synthetic invariants only, no relevance/quality claim'})
    (args.output/'summary.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print(json.dumps(results,indent=2))


if __name__=='__main__':main()
