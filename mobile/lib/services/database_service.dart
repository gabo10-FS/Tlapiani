import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/lote_model.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._init();
  static Database? _database;

  DatabaseService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('tlapiani_local.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE entregas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lote_id TEXT NOT NULL,
        hash_origen TEXT NOT NULL,
        hash_calculado_recepcion TEXT NOT NULL,
        integridad_validada INTEGER NOT NULL, -- 1 = true, 0 = false
        timestamp_entrega TEXT NOT NULL,
        receptor_firma_id TEXT NOT NULL
      )
    ''');
  }

  /// Inserta un registro de entrega validado en la base de datos SQLite local.
  Future<int> insertEntrega(Entrega entrega) async {
    final db = await instance.database;
    return await db.insert('entregas', entrega.toMap());
  }

  /// Obtiene todos los registros de entrega guardados localmente.
  Future<List<Entrega>> readAllEntregas() async {
    final db = await instance.database;
    final List<Map<String, dynamic>> result = await db.query(
      'entregas', 
      orderBy: 'timestamp_entrega DESC'
    );
    return result.map((json) => Entrega.fromMap(json)).toList();
  }

  /// Elimina un registro de entrega por su id (se usa tras sincronizar con el backend).
  Future<int> deleteEntrega(int id) async {
    final db = await instance.database;
    return await db.delete(
      'entregas',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  /// Elimina varios registros por ID de una sola vez.
  Future<void> deleteEntregas(List<int> ids) async {
    final db = await instance.database;
    final String idsList = ids.join(',');
    await db.delete(
      'entregas',
      where: 'id IN ($idsList)',
    );
  }

  /// Limpia todos los registros de la tabla entregas.
  Future<void> clearAll() async {
    final db = await instance.database;
    await db.delete('entregas');
  }

  /// Cierra la conexión de la base de datos.
  Future<void> close() async {
    final db = _database;
    if (db != null) {
      await db.close();
      _database = null;
    }
  }
}
