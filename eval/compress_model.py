"""Reproducible row-wise storage quantization for static models.

Not training or distillation. model2vec-rs expands I8 rows to F32 at load time,
then multiplies each token row by its `weights` entry. Row scales preserve the
relative contributions to mean pooling, rather than incorrectly normalizing
each vocabulary row. Runtime inference remains floating point.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import shutil
import struct
import numpy as np
from eval.contract import digest

DTYPES={'F32':np.dtype('<f4'),'F16':np.dtype('<f2'),'F64':np.dtype('<f8'),'I8':np.dtype('i1')}


def read_tensors(path):
    raw=path.read_bytes()
    size=struct.unpack('<Q',raw[:8])[0]
    if size>len(raw)-8: raise ValueError('Invalid safetensors header')
    header=json.loads(raw[8:8+size])
    payload=memoryview(raw)[8+size:]
    rows={}
    for name,info in header.items():
        if name=='__metadata__': continue
        dtype=DTYPES[info['dtype']]
        start,end=info['data_offsets']
        if not 0<=start<=end<=len(payload) or end-start!=int(np.prod(info['shape']))*dtype.itemsize:
            raise ValueError('Invalid tensor offsets or shape')
        rows[name]=np.frombuffer(payload[start:end],dtype=dtype).reshape(info['shape']).copy()
    return rows


def write_tensors(path,tensors):
    header={}
    payload=[]
    offset=0
    reverse={v.str:k for k,v in DTYPES.items()}
    for name,array in tensors.items():
        array=np.ascontiguousarray(array)
        data=array.tobytes()
        header[name]={'dtype':reverse[array.dtype.str],'shape':list(array.shape),'data_offsets':[offset,offset+len(data)]}
        offset+=len(data)
        payload.append(data)
    encoded=json.dumps(header,separators=(',',':')).encode()
    encoded+=b' '*((-len(encoded))%8)
    with path.open('xb') as stream:
        stream.write(struct.pack('<Q',len(encoded)))
        stream.write(encoded)
        for data in payload: stream.write(data)


def quantized_rows(embeddings,weights=None):
    if embeddings.ndim!=2 or not np.isfinite(embeddings).all(): raise ValueError('Invalid embeddings')
    source=embeddings.astype(np.float32)
    scales=np.max(np.abs(source),axis=1)/127
    scales=np.where(scales>0,scales,1).astype(np.float32)
    packed=np.rint(source/scales[:,None]).clip(-127,127).astype(np.int8)
    if weights is not None:
        if weights.shape!=(len(source),) or not np.isfinite(weights).all(): raise ValueError('Invalid weights')
        scales*=weights.astype(np.float32)
    return packed,scales


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--receipt',type=Path,required=True)
    args=parser.parse_args()
    if args.output.exists(): parser.error('Output must be new')
    tensors=read_tensors(args.source/'model.safetensors')
    if set(tensors)-{'embeddings','weights'}: parser.error('Mapping/other tensor recipes need an explicit implementation')
    packed,scales=quantized_rows(tensors['embeddings'],tensors.get('weights'))
    args.output.mkdir(parents=True)
    write_tensors(args.output/'model.safetensors',{'embeddings':packed,'weights':scales})
    for name in ['tokenizer.json','config.json']:
        shutil.copyfile(args.source/name,args.output/name)
    shutil.copyfile(args.source/'README.md',args.output/'UPSTREAM_MODEL_CARD.md')
    (args.output/'README.md').write_text('---\nlicense: mit\n---\n\nRow-quantized storage derivative of '+args.source.name+'. See UPSTREAM_MODEL_CARD.md for authorship, original license and original training. Conversion uses eval/compress_model.py; no new training. I8 vocabulary rows plus F32 row scales; the current Rust runtime expands rows to F32. No integer inference or runtime-memory reduction is claimed.\n',encoding='utf-8')
    receipt={'operation':'row-wise symmetric int8 storage quantization','not_training':True,'runtime':'model2vec-rs 0.1.4 expands rows to F32; per-token weights apply row scales','source':str(args.source),'output':str(args.output),'shape':list(packed.shape),'source_sha256':{n:digest((args.source/n).read_bytes()) for n in ['model.safetensors','tokenizer.json','config.json']},'output_sha256':{n:digest((args.output/n).read_bytes()) for n in ['model.safetensors','tokenizer.json','config.json']},'source_artifact_bytes':sum((args.source/n).stat().st_size for n in ['model.safetensors','tokenizer.json','config.json']),'output_artifact_bytes':sum((args.output/n).stat().st_size for n in ['model.safetensors','tokenizer.json','config.json'])}
    args.receipt.write_text(json.dumps(receipt,indent=2),encoding='utf-8')
    print(json.dumps(receipt,indent=2))


if __name__=='__main__': main()
