import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-8 max-w-4xl mx-auto px-4">
        <h1 className="text-5xl font-bold mb-4">BPM to Core</h1>
        <p className="text-gray-600 text-lg">SOAP XML Mapping System</p>

        <div className="grid grid-cols-2 gap-6 mt-12">
          {/* Templates */}
          <Link
            href="/templates"
            className="p-8 bg-black text-white hover:bg-gray-800 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            <div className="text-4xl mb-3">📋</div>
            <div className="text-xl font-bold mb-2">Templates</div>
            <div className="text-sm text-gray-300">จัดการ WSDL Templates และ Field Mappings</div>
          </Link>

          {/* Products */}
          <Link
            href="/products"
            className="p-8 bg-white border-2 border-black hover:bg-gray-50 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            <div className="text-4xl mb-3">📦</div>
            <div className="text-xl font-bold mb-2">Products</div>
            <div className="text-sm text-gray-600">จัดการ Products และ Mapping Overrides</div>
          </Link>

          {/* Custom Functions */}
          <Link
            href="/functions"
            className="p-8 bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            <div className="text-4xl mb-3">⚡</div>
            <div className="text-xl font-bold mb-2">Custom Functions</div>
            <div className="text-sm text-blue-100">สร้าง/จัดการ User-Defined Functions</div>
          </Link>

          {/* Config Parameters */}
          <Link
            href="/config"
            className="p-8 bg-green-600 text-white hover:bg-green-700 rounded-lg shadow-lg transition-all hover:scale-105"
          >
            <div className="text-4xl mb-3">⚙️</div>
            <div className="text-xl font-bold mb-2">Config Parameters</div>
            <div className="text-sm text-green-100">จัดการ Config Lookup Tables</div>
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          Dynamic Mapping Engine v2.0 - ไม่ต้องแก้ Code อีกต่อไป! 🎉
        </div>
      </div>
    </main>
  )
}
