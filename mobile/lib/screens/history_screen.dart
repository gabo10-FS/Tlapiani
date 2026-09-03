import 'package:flutter/material.dart';
import '../models/lote_model.dart';
import '../services/database_service.dart';
import '../theme/app_theme.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Entrega> _entregas = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() {
      _isLoading = true;
    });
    final db = DatabaseService.instance;
    final list = await db.readAllEntregas();
    setState(() {
      _entregas = list;
      _isLoading = false;
    });
  }

  Future<void> _deleteEntrega(int id) async {
    final db = DatabaseService.instance;
    await db.deleteEntrega(id);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Registro eliminado de la bitácora local.'),
        backgroundColor: AppTheme.accentBlue,
      ),
    );
    _loadHistory();
  }

  Future<void> _clearAll() async {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? AppTheme.darkBgSecondary : AppTheme.lightBgSecondary;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: cardBg,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('¿Vaciar bitácora local?', style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text(
          'Esto eliminará permanentemente todas las entregas registradas en SQLite local que aún no se hayan sincronizado.',
          style: TextStyle(fontSize: 13.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentCrimson,
              foregroundColor: Colors.white,
              shape: const StadiumBorder(),
            ),
            child: const Text('Eliminar Todo'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final db = DatabaseService.instance;
      await db.clearAll();
      _loadHistory();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final textMain = isDark ? AppTheme.darkTextMain : AppTheme.lightTextMain;
    final textMuted = isDark ? AppTheme.darkTextMuted : AppTheme.lightTextMuted;
    final cardBg = isDark ? AppTheme.darkBgSecondary : AppTheme.lightBgSecondary;
    final glassBorder = isDark ? AppTheme.darkGlassBorder : AppTheme.lightGlassBorder;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bitácora Local (SQLite)'),
        actions: [
          if (_entregas.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.delete_sweep_outlined, color: AppTheme.accentCrimson),
              onPressed: _clearAll,
              tooltip: 'Vaciar bitácora',
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.accentEmerald))
          : _entregas.isEmpty
              ? _buildEmptyState(context, textMain, textMuted)
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  itemCount: _entregas.length,
                  itemBuilder: (context, index) {
                    final entrega = _entregas[index];
                    final Color statusColor = entrega.integridadValidada
                        ? AppTheme.accentEmerald
                        : AppTheme.accentCrimson;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: cardBg,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: statusColor.withOpacity(0.25),
                          width: 1,
                        ),
                        boxShadow: const [AppTheme.shadowSoft],
                      ),
                      child: Theme(
                        data: theme.copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                          iconColor: textMuted,
                          collapsedIconColor: textMuted,
                          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          leading: Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.12),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              entrega.integridadValidada
                                  ? Icons.check_circle_outline_rounded
                                  : Icons.warning_amber_rounded,
                              color: statusColor,
                              size: 22,
                            ),
                          ),
                          title: Text(
                            entrega.loteId,
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: textMain,
                            ),
                          ),
                          subtitle: Text(
                            'Receptor: ${entrega.receptorFirmaId}',
                            style: TextStyle(
                              color: textMuted,
                              fontSize: 12.5,
                            ),
                          ),
                          trailing: StatusBadge(
                            label: entrega.integridadValidada ? 'Válido' : 'Alterado',
                            status: entrega.integridadValidada ? BadgeStatus.emerald : BadgeStatus.crimson,
                          ),
                          children: [
                            Container(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Divider(color: glassBorder),
                                  const SizedBox(height: 6),
                                  _buildHistoryField(textMain, textMuted, 'Fecha de entrega:', entrega.timestampEntrega),
                                  const SizedBox(height: 8),
                                  _buildHistoryField(textMain, textMuted, 'Hash origen (QR):', entrega.hashOrigen),
                                  const SizedBox(height: 8),
                                  _buildHistoryField(textMain, textMuted, 'Hash calculado:', entrega.hashCalculadoRecepcion),
                                  const SizedBox(height: 14),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton.icon(
                                      onPressed: () {
                                        if (entrega.id != null) {
                                          _deleteEntrega(entrega.id!);
                                        }
                                      },
                                      icon: const Icon(Icons.delete_outline, size: 18, color: AppTheme.accentCrimson),
                                      label: const Text('Eliminar registro', style: TextStyle(color: AppTheme.accentCrimson, fontSize: 12.5)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildHistoryField(Color textMain, Color textMuted, String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(color: textMuted, fontSize: 11.5, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 2),
        SelectableText(
          value,
          style: TextStyle(
            color: textMain,
            fontSize: 11,
            fontFamily: value.length > 30 ? 'monospace' : null,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context, Color textMain, Color textMuted) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 68,
              height: 68,
              decoration: BoxDecoration(
                color: AppTheme.accentEmerald.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.folder_open_rounded,
                color: AppTheme.accentEmerald,
                size: 34,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Bitácora Vacía',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: textMain,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No hay entregas pendientes de sincronizar en la base de datos local SQLite.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
