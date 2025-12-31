export default function Home() {
  return (
    <div className="flex items-center justify-center bg-gray-50 min-h-screen">
      <div className="text-center space-y-8 max-w-4xl mx-auto px-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-800">BPM to Core</h1>
          <p className="text-gray-600 text-xl">SOAP XML Mapping System</p>
          <div className="w-24 h-1 bg-black mx-auto rounded"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          <div className="bg-white p-8 rounded-xl shadow-lg border">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-bold mb-2">Templates</h3>
            <p className="text-gray-600 text-sm">จัดการ WSDL Templates และ Field Mappings สำหรับการแปลง XML</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg border">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-xl font-bold mb-2">Products</h3>
            <p className="text-gray-600 text-sm">จัดการ Products และกำหนด Mapping Overrides ตามความต้องการ</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg border">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-bold mb-2">Flow Charts</h3>
            <p className="text-gray-600 text-sm">สร้างและจัดการ Business Process Flows แบบ Visual</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg border">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Custom Functions</h3>
            <p className="text-gray-600 text-sm">สร้างและจัดการ User-Defined Functions สำหรับการประมวลผลข้อมูล</p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-lg border">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-bold mb-2">Config Parameters</h3>
            <p className="text-gray-600 text-sm">จัดการ Config Lookup Tables และพารามิเตอร์ระบบ</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-xl shadow-lg border border-blue-200">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-bold mb-2 text-blue-800">Dynamic Engine</h3>
            <p className="text-blue-600 text-sm">ระบบที่ไม่ต้องแก้ Code อีกต่อไป! จัดการทุกอย่างผ่าน UI</p>
          </div>
        </div>

        <div className="mt-16">
          <div className="text-sm text-gray-500 bg-white px-6 py-3 rounded-full inline-block shadow-sm border">
            Dynamic Mapping Engine v2.0 - ไม่ต้องแก้ Code อีกต่อไป! 🎉
          </div>
        </div>
      </div>
    </div>
  )
}
