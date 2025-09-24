import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Training = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Finetuning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg text-muted-foreground mb-2">
              This feature is not implemented yet.
            </div>
            <div className="text-sm text-muted-foreground">
              Please check back soon.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Training;