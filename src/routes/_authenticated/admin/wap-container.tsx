import { createFileRoute } from '@tanstack/react-router';
import { WAPContainer } from '@/components/wap-container';

export const Route = createFileRoute('/_authenticated/admin/wap-container')({
  component: WAPContainerPage,
});

function WAPContainerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">WAP Container</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Import product details from AliExpress, Temu, Amazon, and other e-commerce platforms.
          Simply paste product links and we&apos;ll automatically extract product information,
          images, and pricing.
        </p>
      </div>

      <WAPContainer />
    </div>
  );
}
