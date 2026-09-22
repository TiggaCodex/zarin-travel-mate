import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ComingNext({ phase, items }: { phase: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Not built yet</CardTitle>
        <CardDescription>This section arrives in {phase}.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
