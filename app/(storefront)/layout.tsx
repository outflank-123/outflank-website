import GiftingNavbar from "@/components/layout/GiftingNavbar";
import GiftingFooter from "@/components/layout/GiftingFooter";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GiftingNavbar />
      <div className="flex-grow">{children}</div>
      <GiftingFooter />
    </>
  );
}
