"use client";
import React from 'react';
import { DocsV1, DocsV2, DocsV3, DocsV4, DocsV5 } from '@/app/docs/page';

export default function VariantDocsPage(props: { params: Promise<{ variant: string }> }) {
    const params = React.use(props.params);
    switch (params.variant) {
        case '1': return <DocsV1 />;
        case '2': return <DocsV2 />;
        case '3': return <DocsV3 />;
        case '4': return <DocsV4 />;
        case '5': return <DocsV5 />;
        default: return <DocsV5 />;
    }
}
