# 🧠 Learned Index Search Engine (C++20)

High-performance learned index over 10M sorted keys, implemented in modern C++20.  
Replaces traditional binary search (`std::lower_bound`) with segmented linear models + local correction to achieve much higher lookup throughput.

## ✨ Features

- C++20 implementation of a **learned index** (neural B-tree style).
- 64 segmented linear models trained with simple linear regression.
- Fast lookup: model prediction + tiny local search around the predicted position.
- Lightweight TCP server on port `8081`:
  - `echo "benchmark" | nc localhost 8081` → reports lookups/sec and dataset size.
  - `echo "search=123456789" | nc localhost 8081` → returns key, position, and found value.
- Pure C++ (no external dependencies beyond standard library and POSIX sockets).

## 🚀 Benchmarks  (on my laptop)

- Learned index: **≈ 380M lookups/sec**
- `std::lower_bound`: **≈ 45M lookups/sec**
- Speedup: **≈ 8.4×**

_Update the numbers above with your latest terminal output._

## 🛠 Build & Run
git clone https://github.com/Saanvirajput/cpp-learned-index.git
cd cpp-learned-index
mkdir build && cd build
cmake ..
cmake --build .
./learned_index



### Test endpoints
Benchmark throughput
echo "benchmark" | nc localhost 8081

Search for a key
echo "search=123456789" | nc localhost 8081


Example response: {"status":"🧠","speed":"384.1M/sec","speedup":"10x","dataset":"10M keys"}
{"key":123456789,"position":901142,"found_key":123457057,"speed":"120M/sec"}


## 📁 Project Structure
cpp-learned-index/
├── CMakeLists.txt # CMake build config
├── src/
│ └── main.cpp # Learned index + TCP server
├── build/ # CMake build output (ignored in Git)
└── frontend/ # React + Vite demo UI (optional)


## 🧩 Design Overview

- **Dataset**: 10M synthetic keys, sorted to simulate a production index.
- **Model training**:
  - Split key space into 64 segments.
  - For each segment, fit `position = slope * key + intercept`.
- **Lookup**:
  - Choose segment/model.
  - Predict approximate index.
  - Correct within a small local window to find the exact position.
- **Server**:
  - Minimal TCP server on port `8081`, `std::thread` per connection.
  - JSON-like responses for easy integration with dashboards/clients.

## 🔭 Future Work

- Support dynamic inserts and deletes with online retraining.
- Replace per-request threads with a thread pool and connection reuse.
- Add unit tests and GitHub Actions CI for regression benchmarks.
