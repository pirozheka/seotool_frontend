import Link from "next/link"

import { DeleteAuditButton } from "@/components/DeleteAuditButton"
import { getAudit } from "@/lib/api"

type AuditPageProps = {
  params: Promise<{
    id: string
  }>
}

type DuplicateCheck = {
  path: string
  url: string
  status_code: number | null
  final_url: string | null
  redirect_count: number
  is_duplicate: boolean
}

type MarkupCheck = {
  schema_org_found?: boolean
  schema_org_types?: string[]
  opengraph_found?: boolean
  opengraph_types?: string[]
}

type PageResourceItem = {
  url?: string
  type?: string
  size_bytes?: number | null
  status_code?: number | null
  error?: string
}

type PageWeightCheck = {
  html_transfer_bytes?: number | null
  html_uncompressed_bytes?: number | null
  total_transfer_bytes?: number | null
  total_transfer_kb?: number | null
  resource_count_found?: number | null
  resource_count_checked?: number | null
  truncated?: boolean | null
  resources?: PageResourceItem[]
  warnings?: string[]
}

type AuditWarning =
  | string
  | {
      message?: string
      code_snippets?: string[]
    }

type ServerSecurityHeader = {
  header?: string
  present?: boolean
  value?: string
}

type ServerInfoCheck = {
  headers?: {
    server?: string
    x_powered_by?: string
    via?: string
    cf_cache_status?: string
  }
  ip_addresses?: string[]
  security_headers?: Record<string, ServerSecurityHeader>
  missing_security_headers?: string[]
}

type SslCertificateCheck = {
  valid_now?: boolean | null
  issuer?: string
  subject?: string
  not_before?: string | null
  not_after?: string | null
  days_until_expiration?: number | null
}

type DomainInfoCheck = {
  registration_date?: string | null
  expiration_date?: string | null
  age_days?: number | null
  days_until_expiration?: number | null
  registrar?: string
  dnssec?: boolean | null
  nameservers?: string[]
}

type SiteChecksShape = {
  checks?: Record<string, unknown>
  warnings?: string[]
}

type SiteChecksData = {
  protocols?: {
    http_to_https?: boolean | null
  }
  www_redirect?: {
    is_ok?: boolean | null
  }
  robots?: {
    found?: boolean | null
    disallow_root?: boolean | null
    has_sitemap?: boolean | null
  }
  homepage_duplicates?: {
    duplicates_found?: boolean | null
    checks?: DuplicateCheck[]
    duplicates?: string[]
  }
  error_404?: {
    is_valid_404?: boolean | null
    has_home_link?: boolean | null
  }
  encoding?: {
    http_charset?: string | null
    html_charset?: string | null
  }
  markup?: MarkupCheck
  page_weight?: PageWeightCheck
  server_info?: ServerInfoCheck
  ssl_certificate?: SslCertificateCheck
  domain_info?: DomainInfoCheck
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function BoolBadge({ value, dangerWhenTrue = false }: { value: boolean; dangerWhenTrue?: boolean }) {
  const isGood = dangerWhenTrue ? !value : value
  return (
    <span className={isGood ? "status-pill status-pill-success" : "status-pill status-pill-danger"}>
      {value ? "Да" : "Нет"}
    </span>
  )
}

function getAuditStatusStyle(status: string) {
  if (status === "done") return "status-pill status-pill-success"
  if (status === "running") return "status-pill status-pill-warning"
  if (status === "error") return "status-pill status-pill-danger"
  return "status-pill status-pill-neutral"
}

function getAuditStatusLabel(status: string) {
  if (status === "done") return "Завершен"
  if (status === "running") return "В работе"
  if (status === "error") return "Ошибка"
  return "В очереди"
}

function FieldItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-700/70 dark:bg-slate-900/70">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <div className="mt-1 text-sm text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  )
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function formatBytes(value: number | null | undefined) {
  if (value == null) return "-"
  return `${(value / 1024).toFixed(1)} KB`
}

function TypeBadges({ types }: { types: string[] }) {
  if (!types.length) {
    return <span className="text-slate-500 dark:text-slate-400">-</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {types.map((typeValue) => (
        <span
          key={typeValue}
          className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800 dark:border-cyan-500/40 dark:bg-cyan-950/50 dark:text-cyan-200"
        >
          {typeValue}
        </span>
      ))}
    </div>
  )
}

function getWarningMessage(warning: AuditWarning) {
  return typeof warning === "string" ? warning : warning.message || "Предупреждение"
}

function getWarningSnippets(warning: AuditWarning) {
  return typeof warning === "string" ? [] : asArray<string>(warning.code_snippets)
}

function WarningItem({ warning }: { warning: AuditWarning }) {
  const snippets = getWarningSnippets(warning)

  return (
    <li className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
      <p>{getWarningMessage(warning)}</p>
      {snippets.length ? (
        <div className="mt-3 space-y-2">
          {snippets.map((snippet, index) => (
            <pre
              key={`${snippet}-${index}`}
              className="max-h-48 overflow-auto rounded-lg border border-amber-200 bg-white/80 p-3 text-xs leading-5 text-slate-800 dark:border-amber-700/50 dark:bg-slate-950/70 dark:text-slate-100"
            >
              <code>{snippet}</code>
            </pre>
          ))}
        </div>
      ) : null}
    </li>
  )
}

export default async function AuditPage({ params }: AuditPageProps) {
  const { id } = await params
  const audit = await getAudit(id)

  const siteChecksRoot = asRecord(audit.site_checks) as SiteChecksShape
  const siteChecks = asRecord(siteChecksRoot.checks ?? siteChecksRoot) as SiteChecksData

  const homepageDuplicates = asRecord(siteChecks.homepage_duplicates)
  const duplicateChecks: DuplicateCheck[] = asArray<DuplicateCheck>(homepageDuplicates.checks)
  const duplicateUrls: string[] = asArray<string>(homepageDuplicates.duplicates)
  const markupChecks: MarkupCheck = asRecord(siteChecks.markup) as MarkupCheck
  const pageWeight: PageWeightCheck = asRecord(siteChecks.page_weight) as PageWeightCheck
  const serverInfo: ServerInfoCheck = asRecord(siteChecks.server_info) as ServerInfoCheck
  const sslCertificate: SslCertificateCheck = asRecord(siteChecks.ssl_certificate) as SslCertificateCheck
  const domainInfo: DomainInfoCheck = asRecord(siteChecks.domain_info) as DomainInfoCheck
  const siteWarnings: string[] = asArray<string>(siteChecksRoot.warnings)

  const topResources = asArray<PageResourceItem>(pageWeight.resources)
    .filter((item) => typeof item.size_bytes === "number")
    .sort((a, b) => (b.size_bytes ?? 0) - (a.size_bytes ?? 0))
    .slice(0, 6)

  const missingSecurityHeaders = asArray<string>(serverInfo.missing_security_headers)
  const nameservers = asArray<string>(domainInfo.nameservers)

  return (
    <main className="page-shell space-y-6">
      <section className="surface-card motion-fade-up relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-200/50 blur-3xl dark:bg-cyan-500/25" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Link href="/" className="inline-flex text-sm text-cyan-700 hover:text-cyan-800 hover:underline dark:text-cyan-300 dark:hover:text-cyan-200">
              ← К списку аудитов
            </Link>
            <h1 className="section-title text-3xl sm:text-4xl">SEO Аудит</h1>
            <p className="max-w-3xl break-all text-slate-600 dark:text-slate-300">{audit.domain}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={getAuditStatusStyle(audit.status)}>{getAuditStatusLabel(audit.status)}</span>
            <DeleteAuditButton auditId={audit.id} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FieldItem label="HTTP код" value={audit.server_status_code ?? "-"} />
          <FieldItem label="Время ответа" value={audit.response_time_ms != null ? `${audit.response_time_ms} мс` : "-"} />
          <FieldItem label="Финальный URL" value={<span className="break-all">{audit.final_url ?? "-"}</span>} />
          <FieldItem label="Индексируемость" value={audit.is_indexable == null ? "-" : audit.is_indexable ? "Да" : "Нет"} />
          <FieldItem label="Создан" value={formatDateTime(audit.created_at)} />
          <FieldItem label="Обновлен" value={formatDateTime(audit.updated_at)} />
        </div>
      </section>

      <section className="surface-card motion-fade-up motion-delay-1">
        <h2 className="section-title">Параметры страницы</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FieldItem label="Title" value={audit.title || "-"} />
          <FieldItem label="H1" value={audit.h1 || "-"} />
          <FieldItem label="Description" value={audit.meta_description || "-"} />
          <FieldItem label="Canonical" value={<span className="break-all">{audit.canonical || "-"}</span>} />
          <FieldItem label="Meta robots" value={audit.meta_robots || "-"} />
          <FieldItem label="Last-Modified" value={audit.last_modified || "-"} />
        </div>
      </section>

      <section className="surface-card motion-fade-up motion-delay-2">
        <h2 className="section-title">Технические проверки</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FieldItem
            label="HTTP → HTTPS"
            value={siteChecks?.protocols?.http_to_https == null ? "-" : <BoolBadge value={siteChecks.protocols.http_to_https} />}
          />
          <FieldItem
            label="WWW redirect"
            value={siteChecks?.www_redirect?.is_ok == null ? "-" : <BoolBadge value={siteChecks.www_redirect.is_ok} />}
          />
          <FieldItem
            label="robots.txt найден"
            value={siteChecks?.robots?.found == null ? "-" : <BoolBadge value={siteChecks.robots.found} />}
          />
          <FieldItem
            label="Disallow / в robots"
            value={siteChecks?.robots?.disallow_root == null ? "-" : <BoolBadge value={siteChecks.robots.disallow_root} dangerWhenTrue />}
          />
          <FieldItem
            label="Sitemap в robots"
            value={siteChecks?.robots?.has_sitemap == null ? "-" : <BoolBadge value={siteChecks.robots.has_sitemap} />}
          />
          <FieldItem
            label="Дубли главной"
            value={
              siteChecks?.homepage_duplicates?.duplicates_found == null
                ? "-"
                : <BoolBadge value={siteChecks.homepage_duplicates.duplicates_found} dangerWhenTrue />
            }
          />
          <FieldItem
            label="Schema.org найден"
            value={markupChecks.schema_org_found == null ? "-" : <BoolBadge value={markupChecks.schema_org_found} />}
          />
          <FieldItem
            label="Open Graph найден"
            value={markupChecks.opengraph_found == null ? "-" : <BoolBadge value={markupChecks.opengraph_found} />}
          />
          <FieldItem
            label="404 код корректный"
            value={siteChecks?.error_404?.is_valid_404 == null ? "-" : <BoolBadge value={siteChecks.error_404.is_valid_404} />}
          />
          <FieldItem
            label="Ссылка на главную с 404"
            value={siteChecks?.error_404?.has_home_link == null ? "-" : <BoolBadge value={siteChecks.error_404.has_home_link} />}
          />
          <FieldItem label="Кодировка HTTP" value={siteChecks?.encoding?.http_charset ?? "-"} />
          <FieldItem label="Кодировка HTML" value={siteChecks?.encoding?.html_charset ?? "-"} />
        </div>

        {duplicateChecks.length ? (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700/70">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left">Path</th>
                  <th className="px-3 py-2 text-left">URL</th>
                  <th className="px-3 py-2 text-left">HTTP</th>
                  <th className="px-3 py-2 text-left">Final URL</th>
                  <th className="px-3 py-2 text-left">Redirects</th>
                  <th className="px-3 py-2 text-left">Дубль</th>
                </tr>
              </thead>
              <tbody>
                {duplicateChecks.map((item, index) => (
                  <tr key={`${item.url}-${index}`} className="border-t border-slate-200 align-top dark:border-slate-700/70">
                    <td className="px-3 py-2 whitespace-nowrap">{item.path}</td>
                    <td className="px-3 py-2 break-all">{item.url}</td>
                    <td className="px-3 py-2">{item.status_code ?? "-"}</td>
                    <td className="px-3 py-2 break-all">{item.final_url ?? "-"}</td>
                    <td className="px-3 py-2">{item.redirect_count}</td>
                    <td className="px-3 py-2">
                      <BoolBadge value={item.is_duplicate} dangerWhenTrue />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : duplicateUrls.length ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Дубли главной (URL)</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {duplicateUrls.map((url) => (
                <li key={url} className="break-all rounded-lg border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                  {url}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Типы разметки</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FieldItem label="Schema.org types" value={<TypeBadges types={markupChecks.schema_org_types ?? []} />} />
            <FieldItem label="Open Graph types" value={<TypeBadges types={markupChecks.opengraph_types ?? []} />} />
          </div>
        </div>
      </section>

      <section className="surface-card motion-fade-up motion-delay-3">
        <h2 className="section-title">Инфраструктура и безопасность</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <FieldItem
            label="SSL валиден сейчас"
            value={sslCertificate.valid_now == null ? "-" : <BoolBadge value={sslCertificate.valid_now} />}
          />
          <FieldItem label="SSL истекает через" value={sslCertificate.days_until_expiration != null ? `${sslCertificate.days_until_expiration} дн.` : "-"} />
          <FieldItem label="SSL issuer" value={sslCertificate.issuer || "-"} />
          <FieldItem label="SSL not before" value={formatDateTime(sslCertificate.not_before)} />
          <FieldItem label="SSL not after" value={formatDateTime(sslCertificate.not_after)} />
          <FieldItem label="Registrar" value={domainInfo.registrar || "-"} />
          <FieldItem label="Возраст домена" value={domainInfo.age_days != null ? `${domainInfo.age_days} дн.` : "-"} />
          <FieldItem label="Домен истекает через" value={domainInfo.days_until_expiration != null ? `${domainInfo.days_until_expiration} дн.` : "-"} />
          <FieldItem label="DNSSEC" value={domainInfo.dnssec == null ? "-" : <BoolBadge value={domainInfo.dnssec} />} />
          <FieldItem label="HTML вес" value={formatBytes(pageWeight.html_uncompressed_bytes)} />
          <FieldItem label="Transfer вес (оценка)" value={formatBytes(pageWeight.total_transfer_bytes)} />
          <FieldItem
            label="Ресурсы (checked/found)"
            value={`${pageWeight.resource_count_checked ?? "-"} / ${pageWeight.resource_count_found ?? "-"}`}
          />
          <FieldItem label="Server" value={serverInfo.headers?.server || "-"} />
          <FieldItem label="X-Powered-By" value={serverInfo.headers?.x_powered_by || "-"} />
          <FieldItem
            label="IP адреса"
            value={asArray<string>(serverInfo.ip_addresses).length ? asArray<string>(serverInfo.ip_addresses).join(", ") : "-"}
          />
        </div>

        {nameservers.length ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Nameservers</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {nameservers.map((ns) => (
                <li key={ns} className="break-all rounded-lg border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                  {ns}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {missingSecurityHeaders.length ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-700/50 dark:bg-amber-950/30">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">Missing Security Headers</h3>
            <ul className="mt-3 space-y-2 text-sm text-amber-800 dark:text-amber-200">
              {missingSecurityHeaders.map((header) => (
                <li key={header} className="rounded-lg border border-amber-200 bg-white/70 px-3 py-2 dark:border-amber-700/50 dark:bg-slate-900/60">
                  {header}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {topResources.length ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700/70 dark:bg-slate-900/50">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">Топ тяжелых ресурсов</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {topResources.map((resource, index) => (
                <li key={`${resource.url}-${index}`} className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-900/60">
                  <p className="break-all">{resource.url ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {resource.type ?? "resource"} • {formatBytes(resource.size_bytes ?? null)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="surface-card motion-fade-up motion-delay-2">
          <h2 className="section-title">Предупреждения страницы</h2>
          {audit.warnings?.length ? (
            <ul className="mt-3 space-y-2">
              {audit.warnings.map((warning: AuditWarning, index: number) => (
                <WarningItem key={index} warning={warning} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Нет предупреждений.</p>
          )}
        </div>

        <div className="surface-card motion-fade-up motion-delay-3">
          <h2 className="section-title">Предупреждения site-level</h2>
          {siteWarnings.length ? (
            <ul className="mt-3 space-y-2">
              {siteWarnings.map((warning: string, index: number) => (
                <li key={index} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
                  {warning}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Нет предупреждений.</p>
          )}
        </div>
      </section>
    </main>
  )
}
