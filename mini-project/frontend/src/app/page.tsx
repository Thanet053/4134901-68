"use client";

import { useState, useEffect, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface VehicleDetail {
  vehicle_type_id: number;
  vehicle_type_name: string;
  direction_type_id: number;
  direction_type_name: string;
  count: number;
}

interface CameraData {
  gate_id: number;
  camera_id: number;
  start: string;
  stop: string;
  details: VehicleDetail[];
}

interface VehicleCountResponse {
  data: CameraData[];
}

export default function VehicleDashboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [data, setData] = useState<CameraData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // แปลงข้อมูลสำหรับตาราง
  const allRows = useMemo(() => {
    return data.flatMap(camera => 
      camera.details.map(detail => ({
        camera_id: camera.camera_id,
        gate_id: camera.gate_id,
        vehicle_type_id: detail.vehicle_type_id,
        vehicle_type_name: detail.vehicle_type_name,
        direction_type_id: detail.direction_type_id,
        direction_type_name: detail.direction_type_name,
        count: detail.count
      }))
    );
  }, [data]);

  // Pagination settings
  const rowsPerPage = 10;
  const totalPages = Math.ceil(allRows.length / rowsPerPage);

  // ข้อมูลสำหรับหน้าปัจจุบัน
  const paginatedRows = useMemo(() => {
    return allRows.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );
  }, [allRows, currentPage]);

  // สร้าง chartData จากข้อมูลจริง
  const chartData = useMemo(() => {
    // คำนวณจำนวนยานพาหนะแต่ละประเภทสำหรับทิศทางเข้า
    const carIn = data.reduce((sum, camera) => 
      sum + (camera.details.find(d => 
        d.vehicle_type_name === "car" && d.direction_type_name === "in"
      )?.count || 0), 0
    );
    
    const motorcycleIn = data.reduce((sum, camera) => 
      sum + (camera.details.find(d => 
        d.vehicle_type_name === "motorcycle" && d.direction_type_name === "in"
      )?.count || 0), 0
    );
    
    const busIn = data.reduce((sum, camera) => 
      sum + (camera.details.find(d => 
        d.vehicle_type_name === "bus" && d.direction_type_name === "in"
      )?.count || 0), 0
    );

    // คำนวณจำนวนยานพาหนะแต่ละประเภทสำหรับทิศทางออก
    const carOut = data.reduce((sum, camera) => 
      sum + (camera.details.find(d => 
        d.vehicle_type_name === "car" && d.direction_type_name === "out"
      )?.count || 0), 0
    );
    
    const motorcycleOut = data.reduce((sum, camera) => 
      sum + (camera.details.find(d => 
        d.vehicle_type_name === "motorcycle" && d.direction_type_name === "out"
      )?.count || 0), 0
    );
    
    const busOut = data.reduce((sum, camera) => 
      sum + (camera.details.find(d => 
        d.vehicle_type_name === "bus" && d.direction_type_name === "out"
      )?.count || 0), 0
    );

    return {
      labels: ["รถยนต์", "จักรยานยนต์", "รถบัส"],
      datasets: [
        {
          label: "เข้า",
          data: [carIn, motorcycleIn, busIn],
          backgroundColor: "#3b82f6",
        },
        {
          label: "ออก", 
          data: [carOut, motorcycleOut, busOut],
          backgroundColor: "#ef4444",
        },
      ],
    };
  }, [data]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
  };

  const fetchGateData = async (gateId: number) => {
    try {
      const response = await fetch(
        `http://localhost:5678/webhook/vehicle_count/all?type=gate&id=${gateId}&start=${startDate}&stop=${endDate}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch data for gate ${gateId}`);
      }
      const text = await response.text();
      if (!text) {
        return [];
      }
      const result: VehicleCountResponse[] = JSON.parse(text);
      return result[0]?.data || [];
    } catch (error) {
      console.error(`Error fetching gate ${gateId}:`, error);
      return [];
    }
  };

  const fetchData = async () => {
    if (!startDate || !endDate) {
      setError("กรุณาเลือกวันที่");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const gates = [1, 2, 3, 4];
      const allData = await Promise.all(gates.map(fetchGateData));
      const combinedData = allData.flat();
      setData(combinedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCameraVehicleCount = (
    cameraId: number,
    vehicleType: string,
    direction: string
  ): number => {
    const camera = data.find((c) => c.camera_id === cameraId);
    if (!camera) return 0;

    const detail = camera.details.find(
      (d) =>
        d.vehicle_type_name === vehicleType &&
        d.direction_type_name === direction
    );
    return detail?.count || 0;
  };

  // รวมยอดแต่ละประเภท
  const totalCar = data.reduce(
    (sum, camera) =>
      sum +
      (camera.details.find(
        (d) =>
          d.vehicle_type_name === "car" && d.direction_type_name === "in"
      )?.count || 0) +
      (camera.details.find(
        (d) =>
          d.vehicle_type_name === "car" && d.direction_type_name === "out"
      )?.count || 0),
    0
  );

  const totalMotorcycle = data.reduce(
    (sum, camera) =>
      sum +
      (camera.details.find(
        (d) =>
          d.vehicle_type_name === "motorcycle" &&
          d.direction_type_name === "in"
      )?.count || 0) +
      (camera.details.find(
        (d) =>
          d.vehicle_type_name === "motorcycle" &&
          d.direction_type_name === "out"
      )?.count || 0),
    0
  );

  const totalBus = data.reduce(
    (sum, camera) =>
      sum +
      (camera.details.find(
        (d) =>
          d.vehicle_type_name === "bus" && d.direction_type_name === "in"
      )?.count || 0) +
      (camera.details.find(
        (d) =>
          d.vehicle_type_name === "bus" && d.direction_type_name === "out"
      )?.count || 0),
    0
  );
  
  return (
    <div>
      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl p-8 mb-8 border border-blue-200 flex flex-col items-center justify-center gap-8 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 -left-10 w-60 h-60 bg-gradient-to-br from-blue-300/30 via-purple-300/20 to-pink-300/20 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-gradient-to-br from-pink-300/30 via-purple-300/20 to-blue-300/20 rounded-full blur-2xl"></div>
          </div>
          <div className="z-10 flex-1 min-w-[300px] w-full flex flex-col items-center">
            <h1 className="text-5xl font-extrabold text-gray-900 mb-6 drop-shadow-lg text-center">
              Dashboard{" "}
              <span className="font-extrabold text-gray-700">
                การนับจำนวนยานพาหนะ
              </span>
            </h1>
            <div className="flex flex-wrap gap-6 items-end justify-center w-full">
              <div className="relative flex flex-col items-center">
                <label className="block text-sm font-semibold text-blue-700 mb-2 tracking-wide text-center">
                  วันที่เริ่มต้น
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-2 border-blue-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 shadow-sm transition-all duration-200 bg-white/70 hover:border-blue-400 focus:border-pink-400 text-gray-700 font-medium text-center"
                />
              </div>
              <div className="relative flex flex-col items-center">
                <label className="block text-sm font-semibold text-blue-700 mb-2 tracking-wide text-center">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-2 border-blue-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 shadow-sm transition-all duration-200 bg-white/70 hover:border-blue-400 focus:border-pink-400 text-gray-700 font-medium text-center"
                />
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-10 py-2 rounded-lg font-bold shadow-lg hover:scale-105 hover:shadow-2xl hover:brightness-110 focus:ring-4 focus:ring-pink-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg tracking-wide"
              >
                {loading ? "กำลังโหลด..." : "ค้นหา"}
              </button>
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow text-center">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="flex flex-wrap justify-center gap-12 mb-14">
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-3xl p-12 shadow-2xl min-w-[390px] flex flex-col items-center scale-100">
          <h3 className="text-2xl font-semibold mb-4 tracking-wide text-center">
            รถยนต์
          </h3>
          <p className="text-6xl font-extrabold drop-shadow-lg text-center">
            {totalCar}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-pink-500 text-white rounded-3xl p-12 shadow-2xl min-w-[390px] flex flex-col items-center scale-100">
          <h3 className="text-2xl font-semibold mb-4 tracking-wide text-center">
            รถจักรยานยนต์
          </h3>
          <p className="text-6xl font-extrabold drop-shadow-lg text-center">
            {totalMotorcycle}
          </p>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-yellow-500 text-white rounded-3xl p-12 shadow-2xl min-w-[390px] flex flex-col items-center scale-100">
          <h3 className="text-2xl font-semibold mb-4 tracking-wide text-center">
            รถบัส
          </h3>
          <p className="text-6xl font-extrabold drop-shadow-lg text-center">
            {totalBus}
          </p>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-purple-200">
        <h2 className="text-3xl font-extrabold text-purple-700 mb-12 tracking-wide">
          แสดงผลยานพาหนะเข้า - ออก ของแต่ละประตู
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((gateId) => {
            const gateCameras = data.filter(
              (camera) => camera.gate_id === gateId
            );

            return (
              <div
                key={gateId}
                className="border border-blue-200 rounded-2xl p-6 bg-gradient-to-br from-white/80 to-blue-50 shadow-lg hover:shadow-2xl transition-all duration-200"
              >
                <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mr-2"></span>
                  ประตู {gateId}
                </h3>

                {gateCameras.length > 0 ? (
                  <div className="space-y-3">
                    {gateCameras.map((camera) => (
                      <div
                        key={camera.camera_id}
                        className="bg-gray-50 rounded-md p-3"
                      >
                        <h4
                          onClick={() =>
                            (window.location.href = `/report?cameraId=${camera.camera_id}&start=${startDate}&stop=${endDate}`)
                          }
                          className="font-medium text-gray-700 mb-2 cursor-pointer hover:text-blue-600"
                        >
                          กล้อง {camera.camera_id}
                        </h4>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {/* รถยนต์ */}
                          <div className="bg-blue-100/80 p-3 rounded-lg shadow-sm">
                            <div className="font-medium text-blue-800">
                              รถยนต์
                            </div>
                            <div className="text-blue-600 font-bold">
                              เข้า:{" "}
                              {getCameraVehicleCount(
                                camera.camera_id,
                                "car",
                                "in"
                              )}{" "}
                              | ออก:{" "}
                              {getCameraVehicleCount(
                                camera.camera_id,
                                "car",
                                "out"
                              )}
                            </div>
                          </div>

                          {/* จักรยานยนต์ */}
                          <div className="bg-green-100/80 p-3 rounded-lg shadow-sm">
                            <div className="font-medium text-green-800">
                              จักรยานยนต์
                            </div>
                            <div className="text-green-600 font-bold">
                              เข้า:{" "}
                              {getCameraVehicleCount(
                                camera.camera_id,
                                "motorcycle",
                                "in"
                              )}{" "}
                              | ออก:{" "}
                              {getCameraVehicleCount(
                                camera.camera_id,
                                "motorcycle",
                                "out"
                              )}
                            </div>
                          </div>

                          {/* รถบัส */}
                          <div className="bg-gradient-to-r from-purple-100/80 to-pink-100/80 p-3 rounded-lg shadow-sm col-span-2">
                            <div className="font-medium text-purple-800">
                              รถบัส
                            </div>
                            <div className="text-purple-600 font-bold">
                              เข้า:{" "}
                              {getCameraVehicleCount(
                                camera.camera_id,
                                "bus",
                                "in"
                              )}{" "}
                              | ออก:{" "}
                              {getCameraVehicleCount(
                                camera.camera_id,
                                "bus",
                                "out"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 italic">
                    ไม่มีข้อมูลกล้องในประตูนี้
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white/70 rounded-2xl shadow-2xl p-8 mt-10 border border-pink-200">
        <h2 className="text-3xl font-extrabold text-pink-700 mb-8 tracking-wide">
          ตารางข้อมูลยานพาหนะเข้า - ออกทั้งหมด
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto rounded-xl overflow-hidden shadow-lg">
            <thead className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">
                  กล้อง
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-purple-700 uppercase tracking-wider">
                  ประเภทยานพาหนะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-pink-700 uppercase tracking-wider">
                  ทิศทาง
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  จำนวน
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedRows.map((row, idx) => (
                <tr
                  key={`${row.camera_id}-${row.vehicle_type_id}-${row.direction_type_id}-${idx}`}
                  className="hover:bg-blue-50/50 transition-all"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-700">
                    Camera {row.camera_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-700 font-semibold">
                    {row.vehicle_type_name === "car"
                      ? "รถยนต์"
                      : row.vehicle_type_name === "motorcycle"
                      ? "จักรยานยนต์"
                      : row.vehicle_type_name === "bus"
                      ? "รถบัส"
                      : row.vehicle_type_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-pink-700 font-semibold">
                    {row.direction_type_name === "in" ? "เข้า" : "ออก"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900">
                    {row.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allRows.length === 0 && (
            <div className="text-center py-8 text-gray-400 italic">
              ไม่มีข้อมูล
            </div>
          )}
        </div>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded bg-orange-400 text-white font-bold shadow hover:bg-orange-500 disabled:opacity-50"
            >
              {"<"} ก่อนหน้า
            </button>
            <span className="font-semibold text-lg">
              หน้า {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded bg-orange-400 text-white font-bold shadow hover:bg-orange-500 disabled:opacity-50"
            >
              หน้าถัดไป {">"}
            </button>
          </div>
        )}
      </div>

      {/* Vehicle Statistics Chart */}
      <div
        className="bg-white/80 rounded-3xl shadow-2xl p-12 mt-14 border border-blue-100 max-w-5xl mx-auto w-full"
        style={{
          minHeight: 600,
          backdropFilter: "blur(8px)",
          boxShadow: "0 16px 56px 0 rgba(31, 38, 135, 0.22)",
        }}
      >
        <div style={{ height: 480 }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}