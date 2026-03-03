"use client";
import React from 'react';
import { DownloadV1, DownloadV2, DownloadV3, DownloadV4, DownloadV5 } from '@/app/download/page';

export default function VariantDownloadPage(props: { params: Promise<{ variant: string }> }) {
    const params = React.use(props.params);
    switch (params.variant) {
        case '1': return <DownloadV1 />;
        case '2': return <DownloadV2 />;
        case '3': return <DownloadV3 />;
        case '4': return <DownloadV4 />;
        case '5': return <DownloadV5 />;
        default: return <DownloadV5 />;
    }
}
