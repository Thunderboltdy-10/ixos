"use client";
import React from 'react';
import { AuthV1, AuthV2, AuthV3, AuthV4, AuthV5 } from '@/app/signin/page';

export default function VariantSignupPage(props: { params: Promise<{ variant: string }> }) {
    const params = React.use(props.params);
    switch (params.variant) {
        case '1': return <AuthV1 type="signup" />;
        case '2': return <AuthV2 type="signup" />;
        case '3': return <AuthV3 type="signup" />;
        case '4': return <AuthV4 type="signup" />;
        case '5': return <AuthV5 type="signup" />;
        default: return <AuthV5 type="signup" />;
    }
}
