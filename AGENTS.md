# HMS - Agent Configuration

## Standing preferences

- **Dark mode only.** No light mode, no theme toggle anywhere. Use slate-900/950 surfaces, slate-100/300 text, blue-600 primary, teal-500 accent. Decided in #10.
- **Use shadcn/ui components.** Never write raw `<input>`, `<select>`, `<textarea>`, or `<button>` elements. Use the shadcn equivalents from `@/components/ui/`:
  - `<Button>` instead of `<button>` (variants: default, outline, ghost, secondary, destructive, link; sizes: default, sm, lg, icon, icon-sm)
  - `<Input>` instead of `<input type="text/email/number/date/time/tel">`
  - `<Textarea>` instead of `<textarea>`
  - `<Label>` instead of `<label>` (with `htmlFor` + `id` on the control)
  - `<Select>` / `<SelectTrigger>` / `<SelectValue>` / `<SelectContent>` / `<SelectItem>` instead of `<select>` (uses `value` + `onValueChange`, not `onChange`)
  - `<Card>` / `<CardHeader>` / `<CardTitle>` / `<CardDescription>` / `<CardContent>` / `<CardFooter>` instead of custom card divs
  - If a needed component is missing, install it with `npx shadcn@latest add <component>`

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (via `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
