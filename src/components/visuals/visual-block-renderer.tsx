import { getVisualTemplate } from "@/components/visuals/registry";
import { UnsupportedVisual } from "@/components/visuals/unsupported-visual";
import type { VisualBlock } from "@/lib/schema/visualBlocks";

export function VisualBlockRenderer({ block }: { block: VisualBlock }) {
  const template = getVisualTemplate(block.templateId);
  if (!template) {
    return (
      <UnsupportedVisual
        title={block.title}
        reason={`Unsupported visual type: "${block.templateId}".`}
      />
    );
  }

  const parsed = template.paramsSchema.safeParse(block.parameters);
  if (!parsed.success) {
    return (
      <UnsupportedVisual
        title={block.title}
        reason="This visual's parameters could not be validated."
      />
    );
  }

  const Component = template.Component;
  return (
    <figure className="flex flex-col gap-2">
      <Component parameters={parsed.data} />
      <figcaption className="sr-only">{block.accessibilityDescription}</figcaption>
    </figure>
  );
}
