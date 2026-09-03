import 'package:flutter/material.dart';
import '../models/lote_model.dart';
import '../services/cryptography_service.dart';
import '../services/database_service.dart';
import '../theme/app_theme.dart';

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
    final isDark = theme.brightness == Brightness.dark;
    final textMain = isDark ? AppTheme.darkTextMain : AppTheme.lightTextMain;
    final textMuted = isDark ? AppTheme.darkTextMuted : AppTheme.lightTextMuted;
    final cardBg = isDark ? AppTheme.darkBgSecondary : AppTheme.lightBgSecondary;
    final glassBorder = isDark ? AppTheme.darkGlassBorder : AppTheme.lightGlassBorder;

    final lote = ModalRoute.of(context)!.settings.arguments as Lote;

    // Cálculo estricto del hash local bajo el estándar oficial
    final String hashCalculado = CryptographyService.calcularHash(lote);
    final bool esValido = CryptographyService.validarIntegridad(lote, hashCalculado);

    final Color statusColor = esValido ? AppTheme.accentEmerald : AppTheme.accentCrimson;
    final IconData statusIcon = esValido ? Icons.verified_rounded : Icons.gpp_bad_rounded;
    final String statusTitle = esValido ? 'PAQUETE ÍNTEGRO' : 'ALERTA DE MANIPULACIÓN';
    final String statusSubtitle = esValido 
        ? 'El sello criptográfico SHA-256 coincide exactamente con los metadatos.' 
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
            backgroundColor: statusColor,
          ),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Validación de Custodia'),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Encabezado del resultado (Tarjeta con bordes de acento e icono)
              Container(
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: statusColor.withOpacity(0.35),
                    width: 1.2,
                  ),
                  boxShadow: const [AppTheme.shadowSoft],
                ),
                padding: const EdgeInsets.all(22.0),
                child: Column(
                  children: [
                    Container(
                      width: 60,
                      height: 60,
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        statusIcon,
                        color: statusColor,
                        size: 34,
                      ),
                    ),
                    const SizedBox(height: 14),
                    StatusBadge(
                      label: esValido ? 'VERIFICADO' : 'ALTERADO',
                      status: esValido ? BadgeStatus.emerald : BadgeStatus.crimson,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      statusTitle,
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                        color: statusColor,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      statusSubtitle,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12.5,
                        color: textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Metadatos del Lote (Tarjeta de datos estilo Dashboard)
              Text(
                'METADATOS DEL LOTE',
                style: TextStyle(
                  color: textMuted,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: glassBorder, width: 1),
                  boxShadow: const [AppTheme.shadowSoft],
                ),
                padding: const EdgeInsets.all(18.0),
                child: Column(
                  children: [
                    _buildDetailRow(textMain, textMuted, 'ID Lote', lote.loteId),
                    Divider(color: glassBorder),
                    _buildDetailRow(textMain, textMuted, 'Tipo de Bien', lote.tipoBien),
                    Divider(color: glassBorder),
                    _buildDetailRow(textMain, textMuted, 'Cantidad', '${lote.cantidadKg.toStringAsFixed(2)} Kg'),
                    Divider(color: glassBorder),
                    _buildDetailRow(textMain, textMuted, 'Comunidad Destino', 'ID ${lote.comunidadDestinoId}'),
                    Divider(color: glassBorder),
                    _buildDetailRow(textMain, textMuted, 'Fecha de Creación', lote.timestampCreacion),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Comparador de Hashes SHA-256
              Text(
                'COMPARADOR CRIPTOGRÁFICO',
                style: TextStyle(
                  color: textMuted,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: glassBorder, width: 1),
                  boxShadow: const [AppTheme.shadowSoft],
                ),
                padding: const EdgeInsets.all(18.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Hash en Origen (QR):',
                      style: TextStyle(color: textMuted, fontSize: 11.5, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 4),
                    SelectableText(
                      lote.hashOrigen,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: textMain,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Hash Calculado en Recepción (Local):',
                      style: TextStyle(color: textMuted, fontSize: 11.5, fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(height: 4),
                    SelectableText(
                      hashCalculado,
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        color: statusColor,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Formulario de Firma del Receptor
              Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'FIRMA DIGITAL DE RECEPCIÓN',
                      style: TextStyle(
                        color: textMuted,
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _curpController,
                      style: TextStyle(color: textMain, fontSize: 14),
                      decoration: InputDecoration(
                        labelText: 'CURP o Identificador del Receptor',
                        labelStyle: TextStyle(color: textMuted, fontSize: 13),
                        fillColor: cardBg,
                        filled: true,
                        prefixIcon: Icon(Icons.badge_outlined, color: textMuted, size: 20),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: glassBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppTheme.accentBlue, width: 1.5),
                        ),
                        errorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppTheme.accentCrimson),
                        ),
                        focusedErrorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppTheme.accentCrimson, width: 1.5),
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
                    const SizedBox(height: 24),

                    // Botón Pill para registrar entrega
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: esValido ? const [AppTheme.glowEmerald] : null,
                      ),
                      child: ElevatedButton(
                        onPressed: _isSaving ? null : registrarEntrega,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: statusColor,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: const StadiumBorder(),
                          textStyle: const TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            letterSpacing: 0.5,
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
                            : const Text('REGISTRAR EN BITÁCORA LOCAL'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: textMuted,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: const StadiumBorder(),
                        side: BorderSide(color: glassBorder),
                      ),
                      child: const Text('CANCELAR Y VOLVER'),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(Color textMain, Color textMuted, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: textMuted,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                color: textMain,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
