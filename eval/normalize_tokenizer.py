"""Explicit static-model variant without hidden token clipping or batch padding.

Preserves parent weights. This changes preparation/runtime behavior and therefore
the artifact fingerprint; original models remain untouched and attributable.
"""
import argparse
import json
from pathlib import Path
import shutil
from eval.run import artifact_identity


def prepare(source,output):
    if output.exists():raise ValueError('Use a new artifact folder')
    before=artifact_identity(source)
    tokenizer=json.loads((source/'tokenizer.json').read_text(encoding='utf-8'))
    inherited={'truncation':tokenizer.get('truncation'),'padding':tokenizer.get('padding')}
    tokenizer.update(truncation=None,padding=None)
    output.mkdir(parents=True)
    for name in ['model.safetensors','config.json']:shutil.copyfile(source/name,output/name)
    (output/'tokenizer.json').write_text(json.dumps(tokenizer,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    shutil.copyfile(source/'README.md',output/'UPSTREAM_MODEL_CARD.md')
    (output/'README.md').write_text('---\nlicense: mit\n---\n\nExplicit tokenizer-coverage variant of '+source.name+'. Original weights are unchanged; no new training. The tokenizer has truncation=null and padding=null for full-token static pooling and batch-independent inputs. Parent attribution/license/training are in UPSTREAM_MODEL_CARD.md. See eval/normalize_tokenizer.py and the source receipt. Longer input is not presumed to improve retrieval; it is evaluated separately.\n',encoding='utf-8')
    after=artifact_identity(output)
    if artifact_identity(source)!=before:raise ValueError('Parent artifacts changed')
    return {'operation':'remove inherited tokenizer truncation/padding','source':before,'output':after,'inherited_settings':inherited,'weights_unchanged':before['files']['model.safetensors']==after['files']['model.safetensors'],'new_training':False}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--receipt',type=Path,required=True)
    args=parser.parse_args()
    receipt=prepare(args.source,args.output)
    args.receipt.write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps(receipt,indent=2))
