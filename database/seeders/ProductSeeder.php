<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Catálogo ficticio de una tienda de tecnología (computadores, componentes,
     * periféricos, redes, etc.). La mayoría del catálogo queda con stock
     * saludable; solo un subconjunto deliberado (~15 productos) arranca en
     * las franjas crítica/agotada del semáforo, para que las alertas de
     * inventario tengan datos realistas desde el primer `migrate:fresh --seed`
     * sin que la tienda entera luzca desabastecida.
     */
    public function run(): void
    {
        $products = [
            // Portátiles
            ['code' => 'LAP-001', 'category_name' => 'Portátiles', 'name' => 'Portátil Lenovo IdeaPad 3 Ryzen 5 8GB 512GB SSD', 'stock' => 14, 'description' => 'Portátil para trabajo y estudio, Ryzen 5, 8GB RAM, SSD 512GB.', 'supplier' => 1, 'unit_price' => 2350000],
            ['code' => 'LAP-002', 'category_name' => 'Portátiles', 'name' => 'Portátil HP Pavilion 15 Intel i5 8GB 512GB SSD', 'stock' => 11, 'description' => 'Portátil HP Pavilion 15, Intel Core i5, 8GB RAM, SSD 512GB.', 'supplier' => 1, 'unit_price' => 2680000],
            ['code' => 'LAP-003', 'category_name' => 'Portátiles', 'name' => 'Portátil Gamer ASUS TUF F15 i7 16GB RTX 4060', 'stock' => 9, 'description' => 'Portátil gamer ASUS TUF F15, i7, 16GB RAM, RTX 4060.', 'supplier' => 2, 'unit_price' => 6200000],
            ['code' => 'LAP-004', 'category_name' => 'Portátiles', 'name' => 'Portátil Dell Inspiron 14 Intel i3 8GB 256GB SSD', 'stock' => 0, 'description' => 'Portátil Dell Inspiron 14, Intel Core i3, 8GB RAM, SSD 256GB.', 'supplier' => 1, 'unit_price' => 1750000],
            ['code' => 'LAP-005', 'category_name' => 'Portátiles', 'name' => 'MacBook Air M2 8GB 256GB', 'stock' => 1, 'description' => 'MacBook Air chip M2, 8GB RAM unificada, SSD 256GB.', 'supplier' => 2, 'unit_price' => 5450000],
            ['code' => 'LAP-006', 'category_name' => 'Portátiles', 'name' => 'Portátil Acer Aspire 5 Ryzen 7 16GB 512GB SSD', 'stock' => 10, 'description' => 'Portátil Acer Aspire 5, Ryzen 7, 16GB RAM, SSD 512GB.', 'supplier' => 1, 'unit_price' => 3100000],
            ['code' => 'LAP-007', 'category_name' => 'Portátiles', 'name' => 'Portátil Gamer Lenovo Legion 5 i7 16GB RTX 4070', 'stock' => 9, 'description' => 'Portátil gamer Lenovo Legion 5, i7, 16GB RAM, RTX 4070.', 'supplier' => 2, 'unit_price' => 7900000],

            // Computadores de Escritorio
            ['code' => 'PC-001', 'category_name' => 'Computadores de Escritorio', 'name' => 'PC Escritorio Ryzen 5 16GB 512GB SSD', 'stock' => 12, 'description' => 'Equipo de escritorio ensamblado, Ryzen 5, 16GB RAM, SSD 512GB.', 'supplier' => 1, 'unit_price' => 2450000],
            ['code' => 'PC-002', 'category_name' => 'Computadores de Escritorio', 'name' => 'PC Escritorio Intel i5 8GB 480GB SSD', 'stock' => 15, 'description' => 'Equipo de escritorio ensamblado, Intel Core i5, 8GB RAM, SSD 480GB.', 'supplier' => 1, 'unit_price' => 2100000],
            ['code' => 'PC-003', 'category_name' => 'Computadores de Escritorio', 'name' => 'PC Gamer Ryzen 7 32GB RTX 4060 Ti', 'stock' => 9, 'description' => 'PC gamer Ryzen 7, 32GB RAM, RTX 4060 Ti, SSD 1TB.', 'supplier' => 2, 'unit_price' => 8500000],
            ['code' => 'PC-004', 'category_name' => 'Computadores de Escritorio', 'name' => 'All in One HP 24" Intel i3 8GB 256GB SSD', 'stock' => 10, 'description' => 'Todo en uno HP 24 pulgadas, Intel Core i3, 8GB RAM, SSD 256GB.', 'supplier' => 1, 'unit_price' => 2950000],
            ['code' => 'PC-005', 'category_name' => 'Computadores de Escritorio', 'name' => 'Mini PC Intel N100 8GB 256GB SSD', 'stock' => 18, 'description' => 'Mini PC compacto Intel N100, 8GB RAM, SSD 256GB.', 'supplier' => 3, 'unit_price' => 980000],

            // Monitores
            ['code' => 'MON-001', 'category_name' => 'Monitores', 'name' => 'Monitor LG 24" Full HD IPS', 'stock' => 14, 'description' => 'Monitor LG 24 pulgadas Full HD IPS 75Hz.', 'supplier' => 1, 'unit_price' => 560000],
            ['code' => 'MON-002', 'category_name' => 'Monitores', 'name' => 'Monitor Samsung 27" Full HD 100Hz', 'stock' => 12, 'description' => 'Monitor Samsung 27 pulgadas Full HD 100Hz.', 'supplier' => 1, 'unit_price' => 720000],
            ['code' => 'MON-003', 'category_name' => 'Monitores', 'name' => 'Monitor Gamer AOC 24" 165Hz 1ms', 'stock' => 10, 'description' => 'Monitor gamer AOC 24 pulgadas 165Hz 1ms.', 'supplier' => 2, 'unit_price' => 890000],
            ['code' => 'MON-004', 'category_name' => 'Monitores', 'name' => 'Monitor Curvo Samsung 32" QHD 144Hz', 'stock' => 9, 'description' => 'Monitor curvo Samsung 32 pulgadas QHD 144Hz.', 'supplier' => 2, 'unit_price' => 1650000],
            ['code' => 'MON-005', 'category_name' => 'Monitores', 'name' => 'Monitor Portátil 15.6" USB-C Full HD', 'stock' => 10, 'description' => 'Monitor portátil 15.6 pulgadas conexión USB-C.', 'supplier' => 3, 'unit_price' => 620000],
            ['code' => 'MON-006', 'category_name' => 'Monitores', 'name' => 'Monitor Ultrawide LG 29" Full HD', 'stock' => 0, 'description' => 'Monitor ultrawide LG 29 pulgadas Full HD.', 'supplier' => 1, 'unit_price' => 1150000],

            // Componentes PC
            ['code' => 'CPU-001', 'category_name' => 'Componentes PC', 'name' => 'Procesador AMD Ryzen 5 5600', 'stock' => 10, 'description' => 'Procesador AMD Ryzen 5 5600, socket AM4.', 'supplier' => 2, 'unit_price' => 680000],
            ['code' => 'CPU-002', 'category_name' => 'Componentes PC', 'name' => 'Procesador Intel Core i5 12400F', 'stock' => 9, 'description' => 'Procesador Intel Core i5 12400F, socket 1700.', 'supplier' => 2, 'unit_price' => 850000],
            ['code' => 'CPU-003', 'category_name' => 'Componentes PC', 'name' => 'Procesador AMD Ryzen 7 5800X', 'stock' => 9, 'description' => 'Procesador AMD Ryzen 7 5800X, socket AM4.', 'supplier' => 2, 'unit_price' => 1250000],
            ['code' => 'MB-001', 'category_name' => 'Componentes PC', 'name' => 'Tarjeta Madre ASUS Prime B450M-A', 'stock' => 10, 'description' => 'Tarjeta madre ASUS Prime B450M-A, socket AM4.', 'supplier' => 2, 'unit_price' => 480000],
            ['code' => 'MB-002', 'category_name' => 'Componentes PC', 'name' => 'Tarjeta Madre Gigabyte B660M DS3H', 'stock' => 9, 'description' => 'Tarjeta madre Gigabyte B660M DS3H, socket 1700.', 'supplier' => 2, 'unit_price' => 650000],
            ['code' => 'RAM-001', 'category_name' => 'Componentes PC', 'name' => 'Memoria RAM Kingston Fury 16GB DDR4 3200MHz', 'stock' => 20, 'description' => 'Memoria RAM Kingston Fury 16GB DDR4 3200MHz.', 'supplier' => 2, 'unit_price' => 280000],
            ['code' => 'RAM-002', 'category_name' => 'Componentes PC', 'name' => 'Memoria RAM Corsair Vengeance 8GB DDR4 3200MHz', 'stock' => 25, 'description' => 'Memoria RAM Corsair Vengeance 8GB DDR4 3200MHz.', 'supplier' => 2, 'unit_price' => 165000],
            ['code' => 'RAM-003', 'category_name' => 'Componentes PC', 'name' => 'Memoria RAM 16GB DDR5 5200MHz', 'stock' => 0, 'description' => 'Memoria RAM 16GB DDR5 5200MHz.', 'supplier' => 2, 'unit_price' => 390000],

            // Tarjetas Gráficas
            ['code' => 'GPU-001', 'category_name' => 'Tarjetas Gráficas', 'name' => 'Tarjeta Gráfica NVIDIA RTX 4060 8GB', 'stock' => 9, 'description' => 'Tarjeta gráfica NVIDIA GeForce RTX 4060 8GB.', 'supplier' => 2, 'unit_price' => 1850000],
            ['code' => 'GPU-002', 'category_name' => 'Tarjetas Gráficas', 'name' => 'Tarjeta Gráfica NVIDIA RTX 4070 12GB', 'stock' => 1, 'description' => 'Tarjeta gráfica NVIDIA GeForce RTX 4070 12GB.', 'supplier' => 2, 'unit_price' => 3200000],
            ['code' => 'GPU-003', 'category_name' => 'Tarjetas Gráficas', 'name' => 'Tarjeta Gráfica AMD RX 6600 8GB', 'stock' => 10, 'description' => 'Tarjeta gráfica AMD Radeon RX 6600 8GB.', 'supplier' => 2, 'unit_price' => 1350000],
            ['code' => 'GPU-004', 'category_name' => 'Tarjetas Gráficas', 'name' => 'Tarjeta Gráfica NVIDIA GTX 1650 4GB', 'stock' => 0, 'description' => 'Tarjeta gráfica NVIDIA GeForce GTX 1650 4GB.', 'supplier' => 2, 'unit_price' => 850000],

            // Almacenamiento
            ['code' => 'SSD-001', 'category_name' => 'Almacenamiento', 'name' => 'SSD Kingston NV2 500GB NVMe', 'stock' => 18, 'description' => 'Disco SSD Kingston NV2 500GB NVMe M.2.', 'supplier' => 2, 'unit_price' => 180000],
            ['code' => 'SSD-002', 'category_name' => 'Almacenamiento', 'name' => 'SSD Kingston NV2 1TB NVMe', 'stock' => 10, 'description' => 'Disco SSD Kingston NV2 1TB NVMe M.2.', 'supplier' => 2, 'unit_price' => 320000],
            ['code' => 'SSD-003', 'category_name' => 'Almacenamiento', 'name' => 'SSD Samsung 870 EVO 500GB SATA', 'stock' => 9, 'description' => 'Disco SSD Samsung 870 EVO 500GB SATA.', 'supplier' => 3, 'unit_price' => 250000],
            ['code' => 'HDD-001', 'category_name' => 'Almacenamiento', 'name' => 'Disco Duro Seagate 1TB SATA', 'stock' => 9, 'description' => 'Disco duro mecánico Seagate 1TB SATA.', 'supplier' => 3, 'unit_price' => 210000],
            ['code' => 'HDD-002', 'category_name' => 'Almacenamiento', 'name' => 'Disco Duro Externo Toshiba 2TB USB 3.0', 'stock' => 9, 'description' => 'Disco duro externo Toshiba 2TB USB 3.0.', 'supplier' => 3, 'unit_price' => 380000],
            ['code' => 'USB-001', 'category_name' => 'Almacenamiento', 'name' => 'Memoria USB Kingston 64GB 3.0', 'stock' => 40, 'description' => 'Memoria USB Kingston 64GB USB 3.0.', 'supplier' => 3, 'unit_price' => 45000],
            ['code' => 'USB-002', 'category_name' => 'Almacenamiento', 'name' => 'Memoria USB SanDisk 32GB 3.0', 'stock' => 35, 'description' => 'Memoria USB SanDisk 32GB USB 3.0.', 'supplier' => 3, 'unit_price' => 32000],

            // Periféricos
            ['code' => 'TEC-001', 'category_name' => 'Periféricos', 'name' => 'Teclado Mecánico RGB Redragon', 'stock' => 12, 'description' => 'Teclado mecánico gamer RGB marca Redragon.', 'supplier' => 3, 'unit_price' => 180000],
            ['code' => 'TEC-002', 'category_name' => 'Periféricos', 'name' => 'Teclado Membrana Logitech K120', 'stock' => 20, 'description' => 'Teclado de membrana Logitech K120, USB.', 'supplier' => 3, 'unit_price' => 55000],
            ['code' => 'MOU-001', 'category_name' => 'Periféricos', 'name' => 'Mouse Gamer Logitech G203', 'stock' => 15, 'description' => 'Mouse gamer Logitech G203, 8000 DPI.', 'supplier' => 3, 'unit_price' => 95000],
            ['code' => 'MOU-002', 'category_name' => 'Periféricos', 'name' => 'Mouse Inalámbrico Logitech M170', 'stock' => 22, 'description' => 'Mouse inalámbrico Logitech M170.', 'supplier' => 3, 'unit_price' => 48000],
            ['code' => 'KIT-001', 'category_name' => 'Periféricos', 'name' => 'Combo Teclado y Mouse Inalámbrico Logitech MK270', 'stock' => 10, 'description' => 'Combo teclado y mouse inalámbrico Logitech MK270.', 'supplier' => 3, 'unit_price' => 130000],
            ['code' => 'MOU-003', 'category_name' => 'Periféricos', 'name' => 'Mousepad Gamer XL RGB', 'stock' => 9, 'description' => 'Mousepad gamer extendido con luces RGB.', 'supplier' => 3, 'unit_price' => 65000],

            // Audio
            ['code' => 'AUD-001', 'category_name' => 'Audio', 'name' => 'Audífonos Gamer HyperX Cloud Stinger', 'stock' => 10, 'description' => 'Audífonos gamer HyperX Cloud Stinger con micrófono.', 'supplier' => 3, 'unit_price' => 220000],
            ['code' => 'AUD-002', 'category_name' => 'Audio', 'name' => 'Audífonos Bluetooth JBL Tune 510BT', 'stock' => 9, 'description' => 'Audífonos inalámbricos JBL Tune 510BT.', 'supplier' => 3, 'unit_price' => 195000],
            ['code' => 'AUD-003', 'category_name' => 'Audio', 'name' => 'Parlante Bluetooth JBL Go 3', 'stock' => 8, 'description' => 'Parlante portátil Bluetooth JBL Go 3.', 'supplier' => 3, 'unit_price' => 145000],
            ['code' => 'AUD-004', 'category_name' => 'Audio', 'name' => 'Micrófono de Condensador USB Fifine K669', 'stock' => 0, 'description' => 'Micrófono de condensador USB Fifine K669 para streaming.', 'supplier' => 3, 'unit_price' => 190000],
            ['code' => 'AUD-005', 'category_name' => 'Audio', 'name' => 'Parlantes 2.0 Genius SP-HF180', 'stock' => 9, 'description' => 'Parlantes de escritorio Genius SP-HF180.', 'supplier' => 3, 'unit_price' => 85000],

            // Redes y Conectividad
            ['code' => 'RED-001', 'category_name' => 'Redes y Conectividad', 'name' => 'Router TP-Link Archer C6 AC1200', 'stock' => 9, 'description' => 'Router TP-Link Archer C6 AC1200 doble banda.', 'supplier' => 4, 'unit_price' => 175000],
            ['code' => 'RED-002', 'category_name' => 'Redes y Conectividad', 'name' => 'Router WiFi 6 TP-Link Archer AX10', 'stock' => 9, 'description' => 'Router WiFi 6 TP-Link Archer AX10.', 'supplier' => 4, 'unit_price' => 290000],
            ['code' => 'RED-003', 'category_name' => 'Redes y Conectividad', 'name' => 'Switch TP-Link 8 Puertos 10/100/1000', 'stock' => 9, 'description' => 'Switch de red TP-Link 8 puertos gigabit.', 'supplier' => 4, 'unit_price' => 145000],
            ['code' => 'RED-004', 'category_name' => 'Redes y Conectividad', 'name' => 'Cable de Red UTP Cat6 x 305m', 'stock' => 8, 'description' => 'Rollo de cable de red UTP categoría 6, 305 metros.', 'supplier' => 4, 'unit_price' => 420000],
            ['code' => 'RED-005', 'category_name' => 'Redes y Conectividad', 'name' => 'Repetidor WiFi TP-Link RE200', 'stock' => 11, 'description' => 'Repetidor de señal WiFi TP-Link RE200.', 'supplier' => 4, 'unit_price' => 110000],
            ['code' => 'RED-006', 'category_name' => 'Redes y Conectividad', 'name' => 'Adaptador USB WiFi TP-Link TL-WN725N', 'stock' => 1, 'description' => 'Adaptador USB WiFi TP-Link TL-WN725N.', 'supplier' => 4, 'unit_price' => 38000],

            // Impresión
            ['code' => 'IMP-001', 'category_name' => 'Impresión', 'name' => 'Impresora Multifuncional Epson L3250', 'stock' => 9, 'description' => 'Impresora multifuncional Epson L3250 sistema de tinta continua.', 'supplier' => 4, 'unit_price' => 890000],
            ['code' => 'IMP-002', 'category_name' => 'Impresión', 'name' => 'Impresora Láser HP LaserJet M111w', 'stock' => 2, 'description' => 'Impresora láser HP LaserJet M111w WiFi.', 'supplier' => 4, 'unit_price' => 650000],
            ['code' => 'IMP-003', 'category_name' => 'Impresión', 'name' => 'Tóner HP 85A Negro', 'stock' => 9, 'description' => 'Tóner original HP 85A negro.', 'supplier' => 4, 'unit_price' => 210000],
            ['code' => 'IMP-004', 'category_name' => 'Impresión', 'name' => 'Botella de Tinta Epson 664 Negra', 'stock' => 0, 'description' => 'Botella de tinta Epson 664 color negro.', 'supplier' => 4, 'unit_price' => 38000],

            // Cámaras y Seguridad
            ['code' => 'CAM-001', 'category_name' => 'Cámaras y Seguridad', 'name' => 'Webcam Logitech C920 Full HD', 'stock' => 9, 'description' => 'Webcam Logitech C920 Full HD 1080p.', 'supplier' => 4, 'unit_price' => 320000],
            ['code' => 'CAM-002', 'category_name' => 'Cámaras y Seguridad', 'name' => 'Cámara de Seguridad IP WiFi 1080p', 'stock' => 8, 'description' => 'Cámara de seguridad IP WiFi interior 1080p.', 'supplier' => 4, 'unit_price' => 165000],
            ['code' => 'CAM-003', 'category_name' => 'Cámaras y Seguridad', 'name' => 'Kit CCTV 4 Cámaras + DVR', 'stock' => 1, 'description' => 'Kit de vigilancia CCTV con 4 cámaras y DVR.', 'supplier' => 4, 'unit_price' => 980000],

            // Sillas y Mobiliario Gamer
            ['code' => 'SIL-001', 'category_name' => 'Sillas y Mobiliario Gamer', 'name' => 'Silla Gamer Ergonómica Reclinable', 'stock' => 8, 'description' => 'Silla gamer ergonómica reclinable con soporte lumbar.', 'supplier' => 3, 'unit_price' => 650000],
            ['code' => 'SIL-002', 'category_name' => 'Sillas y Mobiliario Gamer', 'name' => 'Silla Gamer Premium con Reposapiés', 'stock' => 1, 'description' => 'Silla gamer premium con reposapiés extensible.', 'supplier' => 3, 'unit_price' => 980000],
            ['code' => 'ESC-001', 'category_name' => 'Sillas y Mobiliario Gamer', 'name' => 'Escritorio Gamer con Soporte para Monitores', 'stock' => 8, 'description' => 'Escritorio gamer con soporte para monitores y organizador de cables.', 'supplier' => 3, 'unit_price' => 480000],

            // Fuentes y Refrigeración
            ['code' => 'FUE-001', 'category_name' => 'Fuentes y Refrigeración', 'name' => 'Fuente de Poder EVGA 500W 80+', 'stock' => 9, 'description' => 'Fuente de poder EVGA 500W certificación 80+.', 'supplier' => 2, 'unit_price' => 210000],
            ['code' => 'FUE-002', 'category_name' => 'Fuentes y Refrigeración', 'name' => 'Fuente de Poder Corsair 650W 80+ Bronze', 'stock' => 8, 'description' => 'Fuente de poder Corsair 650W certificación 80+ Bronze.', 'supplier' => 2, 'unit_price' => 340000],
            ['code' => 'COOL-001', 'category_name' => 'Fuentes y Refrigeración', 'name' => 'Cooler CPU Cooler Master Hyper 212', 'stock' => 9, 'description' => 'Cooler para CPU Cooler Master Hyper 212.', 'supplier' => 2, 'unit_price' => 165000],
            ['code' => 'COOL-002', 'category_name' => 'Fuentes y Refrigeración', 'name' => 'Kit 3 Ventiladores RGB para Gabinete', 'stock' => 0, 'description' => 'Kit de 3 ventiladores RGB para gabinete de PC.', 'supplier' => 2, 'unit_price' => 145000],

            // Cables y Adaptadores
            ['code' => 'CAB-001', 'category_name' => 'Cables y Adaptadores', 'name' => 'Cable HDMI 2.0 1.8m', 'stock' => 30, 'description' => 'Cable HDMI versión 2.0, 1.8 metros.', 'supplier' => 4, 'unit_price' => 25000],
            ['code' => 'CAB-002', 'category_name' => 'Cables y Adaptadores', 'name' => 'Cable USB-C a USB-C 1m', 'stock' => 28, 'description' => 'Cable USB-C a USB-C, 1 metro.', 'supplier' => 4, 'unit_price' => 22000],
            ['code' => 'CAB-003', 'category_name' => 'Cables y Adaptadores', 'name' => 'Adaptador USB-C a HDMI', 'stock' => 14, 'description' => 'Adaptador USB-C a HDMI 4K.', 'supplier' => 4, 'unit_price' => 55000],
            ['code' => 'CAB-004', 'category_name' => 'Cables y Adaptadores', 'name' => 'Hub USB 3.0 4 Puertos', 'stock' => 2, 'description' => 'Hub USB 3.0 de 4 puertos.', 'supplier' => 4, 'unit_price' => 48000],
            ['code' => 'CAB-005', 'category_name' => 'Cables y Adaptadores', 'name' => 'Cable de Poder para PC 1.5m', 'stock' => 25, 'description' => 'Cable de poder estándar para PC de escritorio, 1.5 metros.', 'supplier' => 4, 'unit_price' => 15000],

            // Software y Licencias
            ['code' => 'SOF-001', 'category_name' => 'Software y Licencias', 'name' => 'Licencia Windows 11 Home', 'stock' => 10, 'description' => 'Licencia digital Windows 11 Home.', 'supplier' => 1, 'unit_price' => 480000],
            ['code' => 'SOF-002', 'category_name' => 'Software y Licencias', 'name' => 'Licencia Microsoft Office 2021 Hogar', 'stock' => 8, 'description' => 'Licencia digital Microsoft Office 2021 Hogar y Estudiantes.', 'supplier' => 1, 'unit_price' => 650000],
            ['code' => 'SOF-003', 'category_name' => 'Software y Licencias', 'name' => 'Licencia Antivirus ESET Internet Security 1 año', 'stock' => 0, 'description' => 'Licencia antivirus ESET Internet Security, 1 año, 1 equipo.', 'supplier' => 1, 'unit_price' => 95000],

            // Accesorios
            ['code' => 'ACC-001', 'category_name' => 'Accesorios', 'name' => 'Soporte para Portátil Ajustable', 'stock' => 16, 'description' => 'Soporte ajustable de aluminio para portátil.', 'supplier' => 3, 'unit_price' => 65000],
            ['code' => 'ACC-002', 'category_name' => 'Accesorios', 'name' => 'Base Refrigerante para Portátil', 'stock' => 9, 'description' => 'Base refrigerante con ventiladores para portátil.', 'supplier' => 3, 'unit_price' => 85000],
            ['code' => 'ACC-003', 'category_name' => 'Accesorios', 'name' => 'Kit de Limpieza para Computador', 'stock' => 20, 'description' => 'Kit de limpieza para computador y periféricos.', 'supplier' => 3, 'unit_price' => 28000],
            ['code' => 'ACC-004', 'category_name' => 'Accesorios', 'name' => 'Mochila para Portátil 15.6"', 'stock' => 8, 'description' => 'Mochila resistente al agua para portátil hasta 15.6 pulgadas.', 'supplier' => 3, 'unit_price' => 110000],
            ['code' => 'ACC-005', 'category_name' => 'Accesorios', 'name' => 'Candado de Seguridad Kensington', 'stock' => 8, 'description' => 'Candado de seguridad tipo Kensington para portátil.', 'supplier' => 3, 'unit_price' => 45000],
        ];

        $distriandinaCount = 0;

        $categoriesByName = Category::all()->keyBy('name');

        foreach ($products as $productData) {
            $category = $categoriesByName->get($productData['category_name']);

            if (! $category) {
                \Log::warning("Categoría {$productData['category_name']} no encontrada para el producto {$productData['code']}. Saltando producto y movimiento.");

                continue;
            }

            $priceWithoutTax = (int) round($productData['price_without_tax'] ?? $productData['unit_price'] ?? 0);
            $priceWithTax = (int) round($productData['price_with_tax'] ?? $productData['unit_price'] ?? 0);
            $salePrice = (int) round($productData['sale_price'] ?? $productData['unit_price'] ?? 0);
            $ivaValue = $priceWithTax - $priceWithoutTax;

            $product = Product::create([
                'code' => $productData['code'],
                'category_id' => $category->id,
                'name' => $productData['name'],
                'description' => $productData['description'] ?? null,
                'price_without_tax' => $priceWithoutTax,
                'price_with_tax' => $priceWithTax,
                'iva_value' => $ivaValue,
                'sale_price' => $salePrice,
                'supplier_id' => $productData['supplier'] ?? null,
                'stock' => $productData['stock'] ?? 0,
                'image_path' => null,
                'initial_movement_id' => null,
            ]);

            if ($product && ($productData['stock'] ?? 0) > 0) {
                $movementDate = Carbon::now();
                $note = null;
                $supplierId = $productData['supplier'] ?? null;

                switch ($supplierId) {
                    case 1:
                        $distriandinaCount++;
                        $movementDate = $distriandinaCount <= 30
                            ? Carbon::create(2026, 5, 12)
                            : Carbon::create(2026, 6, 20);
                        $note = 'Compra inicial TecnoMayorista';
                        break;

                    case 2:
                        $movementDate = Carbon::create(2026, 5, 20);
                        $note = 'Compra inicial GlobalTech Distribuciones';
                        break;

                    case 3:
                        $movementDate = Carbon::create(2026, 6, 2);
                        $note = 'Compra inicial Andina Componentes';
                        break;

                    case 4:
                        $movementDate = Carbon::create(2026, 6, 10);
                        $note = 'Compra inicial Conectividad y Redes del Eje';
                        break;

                    default:
                        $note = 'Stock inicial';
                        break;
                }

                $movement = InventoryMovement::create([
                    'product_id' => $product->id,
                    'supplier_id' => $supplierId,
                    'type' => 'Entrada',
                    'quantity' => $productData['stock'],
                    'date' => $movementDate->toDateString(),
                    'notes' => $note,
                ]);

                $product->update(['initial_movement_id' => $movement->id]);
            }
        }
    }
}
