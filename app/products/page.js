'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      // Ensure data is an array
      if (Array.isArray(data)) {
        setProducts(data)
      } else if (data.error) {
        console.error('API Error:', data.error)
        setProducts([])
      } else {
        setProducts([])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Products</h1>
          <Link href="/products/new" className="px-4 py-2 bg-black text-white hover:bg-gray-800">
            + สร้าง Product ใหม่
          </Link>
        </div>

        <div className="border border-black">
          <table className="w-full">
            <thead className="bg-black text-white">
              <tr>
                <th className="p-4 text-left">ชื่อ Product</th>
                <th className="p-4 text-left">Template</th>
                <th className="p-4 text-left">วันที่สร้าง</th>
                <th className="p-4 text-left">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-500">
                    ไม่มีข้อมูล Product
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="border-t border-black hover:bg-gray-50">
                    <td className="p-4">{product.product_name}</td>
                    <td className="p-4">{product.template_name}</td>
                    <td className="p-4">{new Date(product.created_date).toLocaleDateString('th-TH')}</td>
                    <td className="p-4">
                      <Link href={`/products/${product.id}`} className="underline hover:no-underline">
                        แก้ไข
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
