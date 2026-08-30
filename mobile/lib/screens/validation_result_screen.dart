import 'package:flutter/material.dart';
import '../models/lote_model.dart';
import '../services/cryptography_service.dart';
import '../services/database_service.dart';

class ValidationResultScreen extends StatefulWidget {
  const ValidationResultScreen({super.key});

  @override
  State<ValidationResultScreen> createState() => _ValidationResultScreenState();
}

class _ValidationResultScreenState extends State<ValidationResultScreen> {
  final _formKey = GlobalKey<FormState>();
  final _curpController = TextEditingController();
  bool _isSaving = false;

  @override
  void dispose() {
    _curpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lote = ModalRoute.of(context)!.settings.arguments as Lote;

    // Cálculo robusto del hash local soportando formatos con y sin decimales
    final String hash1Decimal = CryptographyService.calcularHash(lote, decimalPlaces: 1);
    final String hash0Decimals = CryptographyService.calcularHash(lote, decimalPlaces: 0);

    bool esValido = false;
    String hashCalculado = hash1Decimal;

    if (CryptographyService.validarIntegridad(lote, hash1Decimal)) {
      esValido = true;
      hashCalculado = hash1Decimal;
    } else if (CryptographyService.validarIntegridad(lote, hash0Decimals)) {
      esValido = true;
      hashCalculado = hash0Decimals;
    }

    final Color primaryColor = esValido ? const Color(0xFF10B981) : const Color(0xFFD32F2F); // Emerald Green o Crimson Red
    final IconData statusIcon = esValido ? Icons.gpp_good : Icons.gpp_bad;
    final String statusTitle = esValido ? 'PAQUETE ÍNTEGRO' : 'ALERTA DE MANIPULACIÓN';
    final String statusSubtitle = esValido 
        ? 'El sello criptográfico coincide con los metadatos registrados.' 
        : '¡Peligro! El hash calculado no coincide con el sello digital de origen.';

    Future<void> registrarEntrega() async {
      if (!_formKey.currentState!.validate()) return;

      setState(() {
        _isSaving = true;
      });

      final entrega = Entrega(
        loteId: lote.loteId,
        hashOrigen: lote.hashOrigen,
        hashCalculadoRecepcion: hashCalculado,
        integridadValidada: esValido,
        timestampEntrega: DateTime.now().toUtc().toIso8601String(),
        receptorFirmaId: _curpController.text.trim().toUpperCase(),
      );

      final db = DatabaseService.instance;
      await db.insertEntrega(entrega);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(esValido 
                ? 'Entrega registrada exitosamente en SQLite local' 
                : 'Alerta de manipulación guardada localmente.'),
            backgroundColor: primaryColor,
          ),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Resultado de Validación'),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Encabezado del resultado (Estilo de tarjeta premium adaptable con brillo lateral)
              Container(
                decoration: BoxDecoration(
                  color: theme.cardTheme.color ?? theme.colorScheme.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: primaryColor.withOpacity(0.4),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: primaryColor.withOpacity(0.08),
                      blurRadius: 15,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  children: [
                    Icon(
                      statusIcon,
                      color: primaryColor,
                      size: 72,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      statusTitle,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: primaryColor,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      statusSubtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: theme.textTheme.bodyMedium?.color?.withOpacity(0.7),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 25),

              // Detalles del Lote Escaneado
              Text(
                'METADATOS DEL LOTE',
                style: TextStyle(
                  color: theme.textTheme.bodyMedium?.color?.withOpacity(0.5) ?? Colors.grey,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: theme.dividerColor),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      _buildDetailRow(context, 'ID Lote', lote.loteId),
                      Divider(color: theme.dividerColor),
                      _buildDetailRow(context, 'Tipo de Bien', lote.tipoBien),
                      Divider(color: theme.dividerColor),
                      _buildDetailRow(context, 'Cantidad', '${lote.cantidadKg} Kg'),
                      Divider(color: theme.dividerColor),
                      _buildDetailRow(context, 'Comunidad Destino', 'ID: ${lote.comunidadDestinoId}'),
                      Divider(color: theme.dividerColor),
                      _buildDetailRow(context, 'Timestamp Origen', lote.timestampCreacion),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 25),

              // Bloque comparador de Hashes
              Text(
                'COMPARADOR CRIPTOGRÁFICO',
                style: TextStyle(
                  color: theme.textTheme.bodyMedium?.color?.withOpacity(0.5) ?? Colors.grey,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 8),
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: theme.dividerColor),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'Hash Firmado en Origen (QR):',
                        style: TextStyle(color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6) ?? Colors.grey, fontSize: 12),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(
                        lote.hashOrigen,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: theme.textTheme.bodyLarge?.color,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Hash Recalculado en Recepción (Local):',
                        style: TextStyle(color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6) ?? Colors.grey, fontSize: 12),
                      ),
                      const SizedBox(height: 4),
                      SelectableText(
                        hashCalculado,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: primaryColor,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 30),

              // Formulario de Firma del Receptor
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'FIRMA DE CUSTODIA',
                      style: TextStyle(
                        color: theme.textTheme.bodyMedium?.color?.withOpacity(0.5) ?? Colors.grey,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _curpController,
                      style: TextStyle(color: theme.textTheme.bodyLarge?.color),
                      decoration: InputDecoration(
                        labelText: 'Identificador del Receptor (CURP)',
                        labelStyle: TextStyle(color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6)),
                        fillColor: theme.cardTheme.color ?? theme.colorScheme.surface,
                        filled: true,
                        prefixIcon: Icon(Icons.badge, color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6)),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: theme.dividerColor),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: primaryColor),
                        ),
                        errorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Colors.redAccent),
                        ),
                        focusedErrorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Colors.redAccent),
                        ),
                      ),
                      textCapitalization: TextCapitalization.characters,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Por favor ingresa la CURP o identificador del receptor.';
                        }
                        if (value.trim().length < 8) {
                          return 'Identificador demasiado corto (mínimo 8 caracteres).';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 25),

                    // Botón para consolidar
                    ElevatedButton(
                      onPressed: _isSaving ? null : registrarEntrega,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isSaving
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              'REGISTRAR RECEPCIÓN EN SQLITE',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(BuildContext context, String label, String value) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: theme.textTheme.bodyMedium?.color?.withOpacity(0.6) ?? Colors.grey, fontSize: 13)),
          const SizedBox(width: 20),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                color: theme.textTheme.bodyLarge?.color,
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
