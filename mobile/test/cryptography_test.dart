import 'package:flutter_test/flutter_test.dart';
import 'package:tlapiani/models/lote_model.dart';
import 'package:tlapiani/services/cryptography_service.dart';

void main() {
  group('Pruebas de Validación Criptográfica - Tlapiani', () {
    test('El hash calculado debe coincidir exactamente con el hash generado por el backend', () {
      final lote = Lote(
        loteId: 'TLAP-2026-9981',
        tipoBien: 'Canasta Básica Alimentos',
        cantidadKg: 25.0,
        comunidadDestinoId: 21005,
        timestampCreacion: '2026-06-29T09:15:00Z',
        hashOrigen: '3191e1598169e91c0fef7bf73fcab3d7978d57eb123d1d199a6092b57b737fd1',
      );

      // Usando el formato oficial unificado con delimitador '|' y 2 decimales fijos
      final hashCalculado = CryptographyService.calcularHash(lote, delimiter: '|', decimalPlaces: 2);
      
      expect(hashCalculado, '3191e1598169e91c0fef7bf73fcab3d7978d57eb123d1d199a6092b57b737fd1');
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
        hashOrigen: '3191E1598169E91C0FEF7BF73FCAB3D7978D57EB123D1D199A6092B57B737FD1', // Mayúsculas
      );

      final hashLocal = '3191e1598169e91c0fef7bf73fcab3d7978d57eb123d1d199a6092b57b737fd1'; // Minúsculas

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
        hashOrigen: '3191e1598169e91c0fef7bf73fcab3d7978d57eb123d1d199a6092b57b737fd1',
      );

      final hashLocalAlterado = '9999e1598169e91c0fef7bf73fcab3d7978d57eb123d1d199a6092b57b737fd9';

      final isMatch = CryptographyService.validarIntegridad(lote, hashLocalAlterado);
      expect(isMatch, false);
    });
  });
}
