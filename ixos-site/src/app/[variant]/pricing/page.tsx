"use client";
import React from 'react';
import { PricingV1, PricingV2, PricingV3, PricingV4, PricingV5 } from '@/app/pricing/page';

export default function VariantPricingPage(props: { params: Promise<{ variant: string }> }) {
    const params = React.use(props.params);
    switch (params.variant) {
        case '1': return <PricingV1 />;
        case '2': return <PricingV2 />;
        case '3': return <PricingV3 />;
        case '4': return <PricingV4 />;
        case '5': return <PricingV5 />;
        default: return <PricingV5 />;
    }
}
