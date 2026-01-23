import { NavbarV2 } from "@/components/landing/v2/layout/NavbarV2";
import { FooterV2 } from "@/components/landing/v2/layout/FooterV2";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <NavbarV2 />
            {children}
            <FooterV2 />
        </>
    );
}
