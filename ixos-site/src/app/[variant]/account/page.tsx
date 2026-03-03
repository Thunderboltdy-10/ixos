"use client";
import React from 'react';
import { AccountV1, AccountV2, AccountV3, AccountV4, AccountV5 } from '@/app/account/page';

export default function VariantAccountPage(props: { params: Promise<{ variant: string }> }) {
    const params = React.use(props.params);
    switch (params.variant) {
        case '1': return <AccountV1 />;
        case '2': return <AccountV2 />;
        case '3': return <AccountV3 />;
        case '4': return <AccountV4 />;
        case '5': return <AccountV5 />;
        default: return <AccountV5 />;
    }
}
