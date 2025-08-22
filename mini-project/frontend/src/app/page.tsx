"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Flatpickr from "react-flatpickr";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import React from "react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface VehicleDetail {
  vehicle_type_name: string;
  direction_type_name: string;
  count: number;
}

interface VehicleData {
  camera_id: string;
  details: VehicleDetail[];
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VehicleData[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [type, setType] = useState("gate");
  const [id, setId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:5678/webhook/vehicle_count/all?type=${type}&id=${id}&start=${startDate.toISOString().split("T")[0]}&stop=${endDate.toISOString().split("T")[0]}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error("ไม่มีข้อมูลจากเซิร์ฟเวอร์");
      }

      const responseData = JSON.parse(text);
      if (!responseData || !Array.isArray(responseData) || !responseData[0]?.data) {
        throw new Error("รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง");
      }

      setData(responseData[0].data);
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const chartData = React.useMemo(() => {
    if (!data.length) return null;

    const vehicleTypes = [...new Set(data.flatMap(item =>
      item.details.map(detail => detail.vehicle_type_name)
    ))];

    const directions = [...new Set(data.flatMap(item =>
      item.details.map(detail => detail.direction_type_name)
    ))];

    const colors = [
      "rgba(75, 192, 192, 0.6)",
      "rgba(255, 99, 132, 0.6)",
      "rgba(54, 162, 235, 0.6)",
    ];

    return {
      labels: vehicleTypes,
      datasets: directions.map((direction, index) => ({
        label: direction,
        data: vehicleTypes.map(type => {
          const count = data.reduce((sum, item) => {
            const detail = item.details.find(d =>
              d.vehicle_type_name === type &&
              d.direction_type_name === direction
            );
            return sum + (detail ? detail.count : 0);
          }, 0);
          return count;
        }),
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace("0.6", "1"),
        borderWidth: 1,
      })),
    };
  }, [data]);

  return (
    <div className="bg-light">
      {loading && (
        <div className="loading active">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">กำลังโหลด...</span>
          </div>
        </div>
      )}

      <div className="container py-5">
        <h1 className="text-center mb-4">ระบบนับจำนวนยานพาหนะ</h1>

        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label">ประเภท</label>
                  <select
                    className="form-select"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    required
                  >
                    <option value="gate">ประตู</option>
                    <option value="camera">กล้อง</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">รหัส</label>
                  <input
                    type="number"
                    className="form-control"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    required
                    min="1"
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">วันที่เริ่มต้น</label>
                  <Flatpickr
                    className="form-control"
                    value={startDate}
                    onChange={([date]) => setStartDate(date)}
                    options={{
                      dateFormat: "Y-m-d",
                    }}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">วันที่สิ้นสุด</label>
                  <Flatpickr
                    className="form-control"
                    value={endDate}
                    onChange={([date]) => setEndDate(date)}
                    options={{
                      dateFormat: "Y-m-d",
                    }}
                  />
                </div>
              </div>
              <div className="text-center mt-3">
                <button type="submit" className="btn btn-primary px-4">
                  ค้นหา
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title mb-4">ผลการค้นหา</h3>
            <div className="table-responsive mb-4">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>รหัสกล้อง</th>
                    <th>ประเภทยานพาหนะ</th>
                    <th>ทิศทาง</th>
                    <th>จำนวน</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  ) : (
                    data.flatMap((item) =>
                      item.details.map((detail, index) => (
                        <tr key={`${item.camera_id}-${index}`}>
                          <td>{item.camera_id || "ไม่ระบุ"}</td>
                          <td>{detail.vehicle_type_name || "ไม่ระบุ"}</td>
                          <td>{detail.direction_type_name || "ไม่ระบุ"}</td>
                          <td>{detail.count || 0}</td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
            {chartData && (
              <div className="mt-4">
                <h4>แผนภูมิแสดงจำนวนยานพาหนะ</h4>
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: "จำนวน",
                        },
                      },
                      x: {
                        title: {
                          display: true,
                          text: "ประเภทยานพาหนะ",
                        },
                      },
                    },
                    plugins: {
                      title: {
                        display: true,
                        text: "จำนวนยานพาหนะแยกตามประเภทและทิศทาง",
                      },
                      legend: {
                        position: "top",
                      },
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
