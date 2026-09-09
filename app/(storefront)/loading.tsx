export default function GlobalStorefrontLoading() {
  return (
    <div className="min-h-screen bg-[#fbfbfd] pt-32 px-6 flex flex-col items-center">
      <div className="max-w-4xl w-full flex flex-col items-center space-y-6">
        <div className="h-4 w-32 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-12 w-3/4 max-w-xl bg-gray-200 rounded-3xl animate-pulse" />
        <div className="h-6 w-1/2 max-w-md bg-gray-100 rounded-xl animate-pulse" />

        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-64 bg-white border border-[#f0f0f2] rounded-3xl p-6 flex flex-col justify-between shadow-xs"
            >
              <div className="h-8 w-1/3 bg-gray-200 rounded-xl animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-100 rounded-lg animate-pulse" />
                <div className="h-4 w-4/5 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
