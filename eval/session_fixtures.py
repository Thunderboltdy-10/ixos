"""Authored ambiguous follow-ups, silence, negative feedback and topic switches.

Gold intent depends on the explicit prior turn. This tests bounded conversation
mechanics, not public-task generalization or autonomous coding success.
"""
import argparse
import json
from pathlib import Path
from eval.contract import digest,load_dataset

TOPICS=[('document-vectors','stored semantic vectors for edited documents'),('queue-workers','jobs assigned to a background queue worker'),('dns-records','domain name resolver address records'),('http-responses','server response pages reused by a browser'),('oauth-tokens','access tokens used for account authorization'),('distributed-leases','exclusive distributed worker ownership'),('compiler-results','incremental compiler build results'),('school-notes','school revision notes with a review deadline')]


def prepare(destination):
    if destination.exists(): raise ValueError('Use a new fixture directory')
    root=destination/'corpus'
    root.mkdir(parents=True)
    paths=[]
    for i,(topic,description) in enumerate(TOPICS):
        path=f'engine/{i:02d}-{topic}.py'
        target=root/path
        target.parent.mkdir(exist_ok=True)
        target.write_text(f'# {topic}: {description}\n# This module maintains {description}.\ndef expires(entry, clock):\n    # When it expires, discard the entry and recompute its value.\n    if clock > entry.deadline:\n        entry.valid = False\n        return rebuild_{topic.replace("-","_")}(entry)\n    return entry.value\n',encoding='utf-8',newline='\n')
        paths.append(path)
    queries=[]
    for i,(_,description) in enumerate(TOPICS):
        sequence=f'follow-{i}'
        target=paths[i]
        alternate=paths[(i+3)%len(paths)]
        texts=[f'Where is {description} maintained?', 'What happens when it expires?', 'How is its value rebuilt?',f'Where is {TOPICS[(i+3)%len(paths)][1]} maintained?','What happens when it expires?']
        for turn,text in enumerate(texts):
            path=target if turn<3 else alternate
            query={'id':f'{sequence}-{turn}','text':text,'group':sequence,'split':'dev','workload':'code-agent','kind':'contextual-followup' if turn in [1,2,4] else 'explicit-topic','answerability':'answerable','gold':[{'path':path,'grade':3,'spans':[[3,8]]}],'sequence':sequence,'turn':turn}
            # Half the episodes get explicit acceptance, half exercise silence.
            if turn==1 and i%2==0: query['feedback']={'query_id':f'{sequence}-0','accepted':[target],'rejected':[]}
            if turn==2 and i%2==0: query['feedback']={'query_id':f'{sequence}-1','accepted':[],'rejected':[paths[(i+1)%len(paths)]]}
            queries.append(query)
    manifest={'schema':1,'id':'ixos-ambiguous-sessions-v1','provenance':{'origin':'Ixos authored session mechanics fixtures','revision':'ambiguous-followup-v1','label_method':'Fixed intended topic before algorithm measurements; feedback only if displayed','license':'MIT OR Apache-2.0','limitations':'Small templated stress cases; no claim of real coding-agent performance. Explicit topic changes remain separately scored.'},'sources':[{'path':p,'sha256':digest((root/p).read_bytes())} for p in paths],'queries':queries}
    file=destination/'sessions.json'
    file.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    dataset=load_dataset(file,root)
    return {'manifest':str(file),'sha256':dataset.fingerprint,'queries':len(queries),'sequences':len(TOPICS)}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination',type=Path,required=True)
    args=parser.parse_args()
    print(json.dumps(prepare(args.destination),indent=2))
