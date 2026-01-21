import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, FileText, DollarSign, TableIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInsurers, useCoverageRules } from "@/hooks/useMasterData";
import { getLineOfBusinessLabel } from "@/types/lineOfBusiness";

interface ScenarioPreviewProps {
  scenario: {
    scenarioId: string;
    scenarioNumber: number;
    scenarioName: string;
    isBase: boolean;
    coverageRuleCode: string;
    insuranceCompanies: string[];
    benefits: Record<string, boolean>;
    status: string;
  };
  packages: any[];
  offers: any[];
  premiumOveralls: any[];
  premiumSummaries: any[];
  scheduleItems: any[];
}

const SECTION_LABELS: Record<string, string> = {
  IP: "In-Patient",
  OP: "Out-Patient",
  DE: "Dental",
  MA: "Maternity",
};

const DEMOGRAPHIC_LABELS: Record<string, string> = {
  M_0_59: "Male 0-59",
  F_0_59: "Female 0-59",
  C_0_59: "Child 0-59",
  M_60_64: "Male 60-64",
  F_60_64: "Female 60-64",
};

export function ScenarioPreview({
  scenario,
  packages,
  offers,
  premiumOveralls,
  premiumSummaries,
  scheduleItems,
}: ScenarioPreviewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tiers: true,
    premiums: true,
  });

  const { data: insurersList } = useInsurers(true);
  const { data: coverageRulesList } = useCoverageRules(true);

  const getInsurerName = (code: string) => {
    return insurersList?.find(i => i.insurer_code === code)?.insurer_name || code;
  };

  const getCoverageRuleName = (code: string) => {
    return coverageRulesList?.find(r => r.coverage_rule_code === code)?.coverage_rule_name || code;
  };

  const formatCurrency = (amount: number) => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Get unique section codes from offers
  const sectionCodes = [...new Set(offers.map(o => o.section_code))];

  return (
    <div className="space-y-4">
      {/* Scenario Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            scenario.isBase ? "bg-primary text-primary-foreground" : "bg-pink-500 text-white"
          )}>
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{scenario.scenarioName}</h3>
              {scenario.isBase && <Badge>Base</Badge>}
              <Badge variant="outline">{scenario.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {getCoverageRuleName(scenario.coverageRuleCode)}
            </p>
          </div>
        </div>
      </div>

      {/* Tier Mapping Section */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("tiers")}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TableIcon className="w-4 h-4" />
              Tier Mapping
            </CardTitle>
            {expandedSections.tiers ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </CardHeader>
        {expandedSections.tiers && (
          <CardContent>
            {packages.map(pkgWrapper => {
              const pkg = pkgWrapper.package;
              if (!pkg) return null;

              const pkgOffers = offers.filter(o => o.package_id === pkg.package_id);

              return (
                <div key={pkg.package_id} className="mb-4 last:mb-0">
                  <h4 className="font-medium mb-2">{pkg.package_name}</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Benefit</TableHead>
                        {scenario.insuranceCompanies.map(code => (
                          <TableHead key={code} className="text-center">
                            {getInsurerName(code)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectionCodes.map(sectionCode => (
                        <TableRow key={sectionCode}>
                          <TableCell className="font-medium">
                            {SECTION_LABELS[sectionCode] || sectionCode}
                          </TableCell>
                          {scenario.insuranceCompanies.map(insurerCode => {
                            const offer = pkgOffers.find(
                              o => o.insurer_code === insurerCode && o.section_code === sectionCode
                            );
                            
                            return (
                              <TableCell key={insurerCode} className="text-center">
                                {offer?.status === "QUOTED" ? (
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge variant="default" className="font-mono">
                                      {offer.offered_tier_code}
                                    </Badge>
                                    {offer.notes && (
                                      <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                                        <AlertTriangle className="w-3 h-3" />
                                        alt
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    N/A
                                  </Badge>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>

      {/* Premium Comparison Section */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => toggleSection("premiums")}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Premium Comparison
            </CardTitle>
            {expandedSections.premiums ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </CardHeader>
        {expandedSections.premiums && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insurer</TableHead>
                  <TableHead className="text-right">Gross Premium</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right font-bold">Grand Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {premiumOveralls.map(overall => (
                  <TableRow key={overall.insurer_code}>
                    <TableCell className="font-medium">
                      {getInsurerName(overall.insurer_code)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(overall.gross_total_all_packages || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency((overall.admin_fee || 0) + (overall.stamp_duty || 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(overall.vat_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {formatCurrency(overall.grand_total || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Find lowest premium */}
            {premiumOveralls.length > 1 && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300">
                  <span className="font-medium">Lowest Premium: </span>
                  {(() => {
                    const lowest = [...premiumOveralls].sort((a, b) => a.grand_total - b.grand_total)[0];
                    return `${getInsurerName(lowest.insurer_code)} at ${formatCurrency(lowest.grand_total)}`;
                  })()}
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Benefit Schedule Tabs */}
      {scheduleItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Benefit Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={scenario.insuranceCompanies[0]} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                {scenario.insuranceCompanies.map(code => (
                  <TabsTrigger key={code} value={code}>
                    {getInsurerName(code)}
                  </TabsTrigger>
                ))}
              </TabsList>

              {scenario.insuranceCompanies.map(insurerCode => {
                const insurerItems = scheduleItems.filter(
                  item => item.insurer_code === insurerCode
                );
                const insurerSections = [...new Set(insurerItems.map(i => i.section_code))];

                return (
                  <TabsContent key={insurerCode} value={insurerCode}>
                    <div className="space-y-4 mt-4">
                      {insurerSections.map(sectionCode => {
                        const sectionItems = insurerItems
                          .filter(i => i.section_code === sectionCode)
                          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

                        return (
                          <div key={sectionCode}>
                            <h5 className="font-medium mb-2">
                              {SECTION_LABELS[sectionCode] || sectionCode}
                            </h5>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Benefit Item</TableHead>
                                  <TableHead className="text-right">Limit</TableHead>
                                  <TableHead className="text-center">Period</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sectionItems.map((item, idx) => (
                                  <TableRow
                                    key={idx}
                                    className={item.is_group_header ? "bg-muted/50" : ""}
                                  >
                                    <TableCell className={item.is_group_header ? "font-medium" : "pl-8"}>
                                      {item.item_name}
                                      {item.sub_label && (
                                        <span className="block text-xs text-muted-foreground">
                                          {item.sub_label}
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {item.value_type === "AMOUNT" && item.value_amount
                                        ? `${formatCurrency(item.value_amount)}${item.unit_text ? ` ${item.unit_text}` : ""}`
                                        : item.value_type === "TEXT"
                                        ? item.value_text
                                        : item.value_type === "BOOLEAN"
                                        ? item.value_text === "true"
                                          ? "Covered"
                                          : "Not Covered"
                                        : "-"}
                                    </TableCell>
                                    <TableCell className="text-center text-sm text-muted-foreground">
                                      {item.limit_period || "-"}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
