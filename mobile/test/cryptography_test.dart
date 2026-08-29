import 'package:flutter_test/flutter_test.dart';
import 'package:tlapiani/models/lote_model.dart';
import 'package:tlapiani/services/cryptography_service.dart';

void main() {
  group('Pruebas de Validación Criptográfica - Tlapiani', () {
    test('El hash calculado debe tener longitud hexadecimal estándar (64 caracteres)', () {
      final lote = Lote(
        loteId: 'TLAP-2026-9981',
        tipoBien: 'Canasta Básica Alimentos',
        cantidadKg: 25.0,
        comunidadDestinoId: 21005,
        timestampCreacion: '2026-06-29T09:15:00Z',
        hashOrigen: '8f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8e',
      );

      final hashCalculado = CryptographyService.calcularHash(lote, delimiter: '', decimalPlaces: 1);
      
      expect(hashCalculado.length, 64);
      expect(RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(hashCalculado), true);
    });

    test('validarIntegridad retorna true si los hashes coinciden (insensible a mayúsculas/minúsculas)', () {
      final lote = Lote(
        loteId: 'TLAP-2026-9981',
        tipoBien: 'Canasta Básica Alimentos',
        cantidadKg: 25.0,
        comunidadDestinoId: 21005,
        timestampCreacion: '2026-06-29T09:15:00Z',
        hashOrigen: '8F3C64E32D1F939E6A7156BB201E51B3A2157548B11119C36209581A32454A8E', // Mayúsculas
      );

      final hashLocal = '8f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8e'; // Minúsculas

      final isMatch = CryptographyService.validarIntegridad(lote, hashLocal);
      expect(isMatch, true);
    });

    test('validarIntegridad retorna false si los hashes no coinciden', () {
      final lote = Lote(
        loteId: 'TLAP-2026-9981',
        tipoBien: 'Canasta Básica Alimentos',
        cantidadKg: 25.0,
        comunidadDestinoId: 21005,
        timestampCreacion: '2026-06-29T09:15:00Z',
        hashOrigen: '8f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8e',
      );

      final hashLocalAlterado = '9f3c64e32d1f939e6a7156bb201e51b3a2157548b11119c36209581a32454a8f';

      final isMatch = CryptographyService.validarIntegridad(lote, hashLocalAlterado);
      expect(isMatch, false);
    });
  });
}
