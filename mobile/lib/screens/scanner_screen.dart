import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'dart:convert';
import '../models/lote_model.dart';
import '../theme/app_theme.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController controller = MobileScannerController();
  bool _hasScanned = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasScanned) return;

    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final barcode = barcodes.first;
      final String? rawValue = barcode.rawValue;

      if (rawValue != null) {
        setState(() {
          _hasScanned = true;
        });
        controller.stop();

        try {
          final Map<String, dynamic> json = jsonDecode(rawValue);
          final lote = Lote.fromJson(json);

          Navigator.of(context).pushReplacementNamed(
            '/validation_result',
            arguments: lote,
          );
        } catch (e) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Código QR no compatible con Tlapiani: $e'),
              backgroundColor: AppTheme.accentCrimson,
              duration: const Duration(seconds: 2),
            ),
          );
          
          Future.delayed(const Duration(seconds: 2), () {
            if (mounted) {
              setState(() {
                _hasScanned = false;
              });
              controller.start();
            }
          });
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text(
          'Escanear QR de Lote',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 17),
        ),
        backgroundColor: AppTheme.darkBgSecondary,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: ValueListenableBuilder<MobileScannerState>(
              valueListenable: controller,
              builder: (context, state, child) {
                switch (state.torchState) {
                  case TorchState.on:
                    return const Icon(Icons.flash_on_rounded, color: AppTheme.accentAmber);
                  case TorchState.off:
                  default:
                    return const Icon(Icons.flash_off_rounded, color: AppTheme.darkTextMuted);
                }
              },
            ),
            onPressed: () => controller.toggleTorch(),
            tooltip: 'Linterna',
          ),
          IconButton(
            icon: ValueListenableBuilder<MobileScannerState>(
              valueListenable: controller,
              builder: (context, state, child) {
                switch (state.cameraDirection) {
                  case CameraFacing.front:
                    return const Icon(Icons.camera_front_rounded, color: Colors.white);
                  case CameraFacing.back:
                  default:
                    return const Icon(Icons.camera_rear_rounded, color: Colors.white);
                }
              },
            ),
            onPressed: () => controller.switchCamera(),
            tooltip: 'Cambiar cámara',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          MobileScanner(
            controller: controller,
            onDetect: _onDetect,
          ),
          // Máscara oscura con marco de escaneo central
          Center(
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.accentEmerald, width: 2.5),
                borderRadius: BorderRadius.circular(24),
                boxShadow: const [AppTheme.glowEmerald],
              ),
            ),
          ),
          // Instrucción inferior
          Positioned(
            bottom: 40,
            left: 20,
            right: 20,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.darkBgSecondary.withOpacity(0.85),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: AppTheme.darkGlassBorder),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.qr_code_scanner_rounded, color: AppTheme.accentEmerald, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Apunta al código QR del paquete de ayuda',
                      style: TextStyle(
                        color: AppTheme.darkTextMain,
                        fontSize: 12.5,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
