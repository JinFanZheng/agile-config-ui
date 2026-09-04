import { Construction } from 'lucide-react'
import { Card, CardContent } from '../components/ui/card'

/** 里程碑占位页：路由就位、功能未到 */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-5 text-base font-semibold">{title}</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <Construction className="h-5 w-5 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  )
}
