import GiftingNavbar from "@/components/layout/GiftingNavbar";
import GiftingFooter from "@/components/layout/GiftingFooter";
import BottomNav from "@/components/layout/BottomNav";

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GiftingNavbar />
      <div className="flex-grow pb-16 md:pb-0">{children}</div>
      <GiftingFooter />
      <BottomNav />
    </>
  );
}
