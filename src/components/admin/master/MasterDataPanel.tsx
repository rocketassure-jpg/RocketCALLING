import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Briefcase, Package } from "lucide-react";
import { InsurerMaster } from "@/components/admin/accounts/InsurerMaster";
import { VendorsMaster } from "@/components/admin/master/VendorsMaster";
import { ProductCatalogMaster } from "@/components/admin/master/ProductCatalogMaster";

export const MasterDataPanel = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Master Data</h2>
        <p className="text-sm text-muted-foreground">Insurance companies, vendors and product categories — pre-loaded for 90% market coverage. Add, edit or remove any time.</p>
      </div>
      <Tabs defaultValue="insurers" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="insurers"><Building2 className="mr-1 h-4 w-4" /> Insurance Companies</TabsTrigger>
          <TabsTrigger value="vendors"><Briefcase className="mr-1 h-4 w-4" /> Vendors</TabsTrigger>
          <TabsTrigger value="products"><Package className="mr-1 h-4 w-4" /> Products</TabsTrigger>
        </TabsList>
        <TabsContent value="insurers"><InsurerMaster /></TabsContent>
        <TabsContent value="vendors"><VendorsMaster /></TabsContent>
        <TabsContent value="products"><ProductCatalogMaster /></TabsContent>
      </Tabs>
    </div>
  );
};
