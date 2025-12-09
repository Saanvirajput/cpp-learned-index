# Learned Index Search Engine (C++20)

High-performance learned index over 10M sorted keys in modern C++20.  
Replaces binary search (`std::lower_bound`) with segmented linear models plus a small local correction window to speed up point lookups.

***

## Features

- C++20 implementation of a learned index (B-tree alternative).
- 64 linear models trained on contiguous key ranges.
- Lookup = model prediction + tiny local fix-up around the predicted index.
- Lightweight TCP server on port `8081`:
  - `benchmark` → overall throughput.
  - `search=<key>` → position and stored key.
- Pure C++ + POSIX sockets (no external libraries).

***

## Benchmarks (example)

Update with your real numbers from the terminal:

- Learned index: **~380M lookups/sec**
- `std::lower_bound`: **~45M lookups/sec**
- Speedup: **~8.4×**

***

## Build & Run

```bash
git clone https://github.com/Saanvirajput/cpp-learned-index.git
cd cpp-learned-index
mkdir build && cd build
cmake ..
cmake --build .
./learned_index
```


### Test endpoints

```bash
Benchmark throughput
echo "benchmark" | nc localhost 8081

Search for a key
echo "search=123456789" | nc localhost 8081
```


Example response:
```bash

{"status":"🧠","speed":"384.1M/sec","speedup":"10x","dataset":"10M keys"}
{"key":123456789,"position":901142,"found_key":123457057,"speed":"120M/sec"}
```

## Project Structure
```bash

cpp-learned-index/
├── CMakeLists.txt # CMake build config
├── src/
│ └── main.cpp # Learned index + TCP server
├── build/ # CMake build output
└── frontend/ # React + Vite demo UI (optional)

```

---

## High-Level Design

- **Dataset**: 10M synthetic keys sorted to mimic a real index.
- **Training**: split keys into 64 segments; for each segment, fit `position ≈ slope * key + intercept`.
- **Lookup**: pick segment, predict index, then scan a small window around it to correct error.
- **Server**: TCP loop using `std::thread` per client with a simple text protocol (`benchmark`, `search=...`).

```bash
cd ~/cpp-learned-index/build
cmake --build .
./learned_index
```
```
echo "benchmark" | nc localhost 8081
echo "search=123456789" | nc localhost 8081
```
