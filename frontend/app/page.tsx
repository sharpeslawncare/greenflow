const navigation = [
  "Dashboard",
  "Today's Jobs",
  "Customers",
  "Groups & Routes",
  "Season Planner",
  "Chemical Centre",
  "Stock & Purchasing",
  "Communications",
  "Documents",
  "Reports",
  "Settings",
];

const summaryCards = [
  { title: "Today's Jobs", value: "34", detail: "Group 7 · Treatment 3 of 5" },
  { title: "Gate Reminders", value: "12", detail: "To send this evening" },
  { title: "Extra Requests", value: "3", detail: "Awaiting review" },
  { title: "Chemical Stock", value: "2", detail: "Items require attention" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f8f5] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col bg-[#064b2c] px-5 py-6 text-white lg:flex">
          <div className="mb-8">
            <div className="text-3xl font-bold tracking-tight">GreenFlow</div>
            <div className="mt-1 text-xs uppercase tracking-[0.24em] text-green-200">
              Sharpes Lawn Care
            </div>
          </div>

          <nav className="space-y-1">
            {navigation.map((item, index) => (
              <button
                key={item}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  index === 0
                    ? "bg-[#338b45] text-white"
                    : "text-green-50 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/15 bg-white/5 p-4">
            <div className="font-semibold">Rob Sharpe</div>
            <div className="text-sm text-green-200">Owner</div>
          </div>
        </aside>

        <section className="flex-1 p-5 md:p-8">
          <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-[#338b45]">
                Sharpes Lawn Care – Demo 2028
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Good afternoon, Rob
              </h1>
              <p className="mt-1 text-slate-500">
                Here is today&apos;s operational overview.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
              <div className="font-semibold">Dry until 16:00</div>
              <div className="text-sm text-slate-500">
                Light wind · Suitable for spraying
              </div>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card, index) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div
                  className={`mb-4 h-2 w-12 rounded-full ${
                    index === 3 ? "bg-red-500" : "bg-[#338b45]"
                  }`}
                />
                <p className="text-sm font-semibold text-slate-500">
                  {card.title}
                </p>
                <p className="mt-2 text-4xl font-bold">{card.value}</p>
                <p className="mt-2 text-sm text-slate-500">{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_2fr_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Today&apos;s Products</h2>

              <dl className="mt-5 space-y-5">
                <div>
                  <dt className="text-sm text-slate-500">Fertiliser</dt>
                  <dd className="font-semibold">ProTurf Spring 21-5-6</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Herbicide</dt>
                  <dd className="font-semibold">Pastor Pro</dd>
                </div>
                <div>
                  <dt className="text-sm text-slate-500">Other materials</dt>
                  <dd className="font-semibold">None</dd>
                </div>
              </dl>

              <button className="mt-6 w-full rounded-xl border border-[#338b45] px-4 py-3 font-semibold text-[#176b37] hover:bg-green-50">
                Change products
              </button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Today&apos;s Work</h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                  Group 7
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold">34</div>
                  <div className="text-sm text-slate-500">Jobs</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">5,420</div>
                  <div className="text-sm text-slate-500">Total m²</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">6h 15m</div>
                  <div className="text-sm text-slate-500">Estimated</div>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium">Daily progress</span>
                  <span className="text-slate-500">0 of 34 complete</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-[2%] rounded-full bg-[#338b45]" />
                </div>
              </div>

              <button className="mt-8 rounded-xl bg-[#176b37] px-5 py-3 font-semibold text-white hover:bg-[#125b2f]">
                Start today&apos;s work
              </button>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold">Up Next</h2>

              <div className="mt-5 space-y-4 text-sm">
                <div className="rounded-xl bg-blue-50 p-3">
                  <div className="font-semibold">Wednesday</div>
                  <div className="text-slate-600">Reserved family day</div>
                </div>
                <div className="rounded-xl bg-green-50 p-3">
                  <div className="font-semibold">Thursday</div>
                  <div className="text-slate-600">Group 9 · Treatment 3</div>
                </div>
                <div className="rounded-xl bg-green-50 p-3">
                  <div className="font-semibold">Friday</div>
                  <div className="text-slate-600">Group 10 · Treatment 3</div>
                </div>
              </div>
            </article>
          </div>

          <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Quick Actions</h2>

            <div className="mt-4 flex flex-wrap gap-3">
              {[
                "Start Today's Work",
                "Print Reports",
                "Send Gate Reminders",
                "Chemical Calculator",
                "Season Planner",
                "Customers",
              ].map((action, index) => (
                <button
                  key={action}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    index === 0
                      ? "bg-[#176b37] text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}