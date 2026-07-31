from datetime import datetime, timedelta
import secrets
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from .database import Base

# ── Tabella associazione Voce-Allergene ──────────────────────────────────────
voce_allergeni = Table(
    "voce_allergeni", Base.metadata,
    Column("voce_id",     Integer, ForeignKey("voci_menu.id"), primary_key=True),
    Column("allergene_id",Integer, ForeignKey("allergeni.id"), primary_key=True),
)

# ── Tabella associazione MenuDelGiorno-VoceMenu ──────────────────────────────
menu_voci = Table(
    "menu_voci", Base.metadata,
    Column("menu_id", Integer, ForeignKey("menu_del_giorno.id"), primary_key=True),
    Column("voce_id", Integer, ForeignKey("voci_menu.id"),       primary_key=True),
)


class Outlet(Base):
    __tablename__ = "outlets"
    id         = Column(Integer, primary_key=True)
    nome       = Column(String(100), nullable=False)
    tipo       = Column(String(50), default="ristorante")
    struttura  = Column(String(100))
    indirizzo  = Column(String(200))
    telefono   = Column(String(30))
    email      = Column(String(100))
    attivo     = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sale       = relationship("Sala", back_populates="outlet", cascade="all, delete-orphan")
    turni      = relationship("Turno", back_populates="outlet", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id":self.id,"nome":self.nome,"tipo":self.tipo,"struttura":self.struttura,
                "indirizzo":self.indirizzo,"telefono":self.telefono,"email":self.email,"attivo":self.attivo}


class Sala(Base):
    __tablename__ = "sale"
    id           = Column(Integer, primary_key=True)
    outlet_id    = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    nome         = Column(String(100), nullable=False)
    num_tavoli   = Column(Integer, default=0)
    capienza_max = Column(Integer, default=0)
    attiva       = Column(Boolean, default=True)
    outlet       = relationship("Outlet", back_populates="sale")
    tavoli       = relationship("Tavolo", back_populates="sala", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id":self.id,"outlet_id":self.outlet_id,"nome":self.nome,
                "num_tavoli":self.num_tavoli,"capienza_max":self.capienza_max,"attiva":self.attiva}


class Rango(Base):
    __tablename__ = "ranghi"
    id        = Column(Integer, primary_key=True)
    sala_id   = Column(Integer, ForeignKey("sale.id"), nullable=False)
    nome      = Column(String(50))
    colore    = Column(String(10), default="#3b82f6")
    cameriere = Column(String(100))
    tavoli    = relationship("Tavolo", back_populates="rango")

    def to_dict(self):
        return {"id":self.id,"sala_id":self.sala_id,"nome":self.nome,
                "colore":self.colore,"cameriere":self.cameriere}


class Tavolo(Base):
    __tablename__ = "tavoli"
    id              = Column(Integer, primary_key=True)
    sala_id           = Column(Integer, ForeignKey("sale.id"), nullable=False)
    numero            = Column(String(10), nullable=False)
    capienza          = Column(Integer, default=4)
    status            = Column(String(30), default="disponibile")
    coperti_attuali   = Column(Integer, default=0)
    rango_id          = Column(Integer, ForeignKey("ranghi.id"), nullable=True)
    tavolo_unito_id   = Column(Integer, nullable=True)
    hat_color         = Column(String(10), default="#94a3b8")
    bloccato          = Column(Boolean, default=False)
    bloccato_data     = Column(String(10), nullable=True)   # data blocco YYYY-MM-DD
    bloccato_turno_id = Column(Integer, nullable=True)      # turno specifico del blocco
    turno_occupato_id = Column(Integer, nullable=True)   # turno che ha il tavolo occupato
    pagato            = Column(Boolean, default=False)   # conto pagato, in attesa liberazione
    sala              = relationship("Sala", back_populates="tavoli")
    rango             = relationship("Rango", back_populates="tavoli")
    comande           = relationship("Comanda", back_populates="tavolo", lazy="joined")
    prenotazioni      = relationship("Prenotazione", back_populates="tavolo")

    def to_dict(self):
        # Deduplicate comande by id to avoid doubling from joined load
        seen_ids = set()
        comande_aperte = []
        for c in self.comande:
            if c.status == "aperta" and c.id not in seen_ids:
                seen_ids.add(c.id)
                comande_aperte.append(c)
        totale_oggi = sum(c.totale or 0 for c in comande_aperte)
        cameriere_name = self.rango.cameriere if self.rango and self.rango.cameriere else None
        return {"id":self.id,"sala_id":self.sala_id,"numero":self.numero,
                "capienza":self.capienza,"status":self.status,
                "coperti_attuali":self.coperti_attuali,"rango_id":self.rango_id,
                "tavolo_unito_id":self.tavolo_unito_id,"hat_color":self.hat_color,
                "bloccato":self.bloccato,"totale_oggi":round(totale_oggi,2),
                "cameriere":cameriere_name,
                "turno_occupato_id":self.turno_occupato_id,
                "pagato":bool(getattr(self,"pagato",False)),
                "bloccato_data":self.bloccato_data,
                "bloccato_turno_id":self.bloccato_turno_id}


class Turno(Base):
    __tablename__ = "turni"
    id         = Column(Integer, primary_key=True)
    outlet_id  = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    sala_id    = Column(Integer, ForeignKey("sale.id"), nullable=True)
    servizio   = Column(String(30))           # Colazione / Pranzo / Cena
    nome       = Column(String(50))           # Turno 1, Turno 2 ...
    ora_inizio = Column(String(5))
    ora_fine   = Column(String(5))
    copertura_max = Column(Integer, default=0)
    attivo     = Column(Boolean, default=True)
    outlet     = relationship("Outlet", back_populates="turni")

    def to_dict(self):
        return {"id":self.id,"outlet_id":self.outlet_id,"sala_id":self.sala_id,
                "servizio":self.servizio,"nome":self.nome,"ora_inizio":self.ora_inizio,
                "ora_fine":self.ora_fine,"copertura_max":self.copertura_max,"attivo":self.attivo}


class Allergene(Base):
    __tablename__ = "allergeni"
    id          = Column(Integer, primary_key=True)
    codice      = Column(String(5))            # A, B, C … o numero EU
    nome        = Column(String(100), nullable=False)
    descrizione = Column(Text)
    attivo      = Column(Boolean, default=True)

    def to_dict(self):
        return {"id":self.id,"codice":self.codice,"nome":self.nome,
                "descrizione":self.descrizione,"attivo":self.attivo}


class TipoMenu(Base):
    __tablename__ = "tipi_menu"
    id    = Column(Integer, primary_key=True)
    nome  = Column(String(100), nullable=False)   # Food / Beverage / Cantina
    colore= Column(String(10), default="#64748b")
    ordine= Column(Integer, default=0)

    def to_dict(self):
        return {"id":self.id,"nome":self.nome,"colore":self.colore,"ordine":self.ordine}


class CategoriaMenu(Base):
    __tablename__ = "categorie_menu"
    id        = Column(Integer, primary_key=True)
    nome      = Column(String(100), nullable=False)
    tipo_id   = Column(Integer, ForeignKey("tipi_menu.id"), nullable=True)
    colore    = Column(String(10), default="#3b82f6")
    emoji     = Column(String(10), default="🍽️")
    ordine    = Column(Integer, default=0)
    tipo      = relationship("TipoMenu")
    voci      = relationship("VoceMenu", back_populates="categoria")

    def to_dict(self, include_voci=False):
        d = {"id":self.id,"nome":self.nome,"tipo_id":self.tipo_id,
             "tipo_nome": self.tipo.nome if self.tipo else None,
             "colore":self.colore,"emoji":self.emoji,"ordine":self.ordine}
        if include_voci:
            d["voci"] = [v.to_dict() for v in self.voci if v.attivo]
        return d


class CategoriaCliente(Base):
    __tablename__ = "categorie_cliente"
    id          = Column(Integer, primary_key=True)
    nome        = Column(String(100), nullable=False)
    descrizione = Column(Text)
    sconto_perc = Column(Float, default=0.0)   # % sconto default

    def to_dict(self):
        return {"id":self.id,"nome":self.nome,"descrizione":self.descrizione,
                "sconto_perc":self.sconto_perc}


# Outlets attivi per voce menu (se vuoto = attivo su tutti)
class VoceMenuOutlet(Base):
    __tablename__ = "voce_menu_outlets"
    id        = Column(Integer, primary_key=True)
    voce_id   = Column(Integer, ForeignKey("voci_menu.id", ondelete="CASCADE"), nullable=False)
    outlet_id = Column(Integer, ForeignKey("outlets.id",  ondelete="CASCADE"), nullable=False)


class VoceMenu(Base):
    __tablename__ = "voci_menu"
    id           = Column(Integer, primary_key=True)
    categoria_id = Column(Integer, ForeignKey("categorie_menu.id"), nullable=False)
    nome_it      = Column(String(200), nullable=False)
    nome_en      = Column(String(200))
    nome_de      = Column(String(200))
    nome_fr      = Column(String(200))
    descrizione  = Column(Text)
    prezzo       = Column(Float, nullable=False)
    attivo       = Column(Boolean, default=True)
    ordine       = Column(Integer, default=0)
    categoria    = relationship("CategoriaMenu", back_populates="voci")
    allergeni    = relationship("Allergene", secondary=voce_allergeni, lazy="joined")
    outlet_links    = relationship("VoceMenuOutlet",     cascade="all,delete-orphan")
    stampanti_links = relationship("VoceMenuStampante",  cascade="all,delete-orphan", lazy="joined")
    monitor_links   = relationship("VoceMenuMonitor",    cascade="all,delete-orphan", lazy="joined")
    nel_web_menu    = Column(Boolean, default=False)               # auto-include in web menu
    prezzi_spec  = relationship("PrezzoSpeciale", back_populates="voce", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id":self.id,"categoria_id":self.categoria_id,
                "categoria_nome": self.categoria.nome if self.categoria else None,
                "nome_it":self.nome_it,"nome_en":self.nome_en,
                "nome_de":self.nome_de,"nome_fr":self.nome_fr,
                "descrizione":self.descrizione,"prezzo":self.prezzo,"attivo":self.attivo,
                "allergeni":[a.to_dict() for a in self.allergeni],
                "prezzi_spec":[p.to_dict() for p in self.prezzi_spec],"outlet_ids":[ol.outlet_id for ol in self.outlet_links],"ordine":self.ordine,"nel_web_menu":bool(self.nel_web_menu),"stampanti_config":[{"stampante_id":s.stampante_id,"outlet_id":s.outlet_id,"contesto":s.contesto} for s in self.stampanti_links] if hasattr(self,"stampanti_links") else [],"monitor_config":[{"monitor_id":m.monitor_id,"tutti_monitor":bool(m.tutti_monitor)} for m in self.monitor_links] if hasattr(self,"monitor_links") else []}


class PrezzoSpeciale(Base):
    __tablename__ = "prezzi_speciali"
    id                   = Column(Integer, primary_key=True)
    voce_id              = Column(Integer, ForeignKey("voci_menu.id"), nullable=False)
    categoria_cliente_id = Column(Integer, ForeignKey("categorie_cliente.id"), nullable=True)
    outlet_id            = Column(Integer, ForeignKey("outlets.id"), nullable=True)
    prezzo_override      = Column(Float, nullable=False)
    voce                 = relationship("VoceMenu", back_populates="prezzi_spec")
    cat_cliente          = relationship("CategoriaCliente")

    def to_dict(self):
        return {"id":self.id,"voce_id":self.voce_id,
                "categoria_cliente_id":self.categoria_cliente_id,
                "cat_cliente_nome": self.cat_cliente.nome if self.cat_cliente else None,
                "outlet_id": self.outlet_id,
                "prezzo_override":self.prezzo_override}


class MenuDelGiorno(Base):
    __tablename__ = "menu_del_giorno"
    id            = Column(Integer, primary_key=True)
    outlet_id     = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    nome          = Column(String(200), nullable=False)
    data          = Column(String(10))             # "2026-03-22"
    prezzo_fisso  = Column(Float, nullable=True)   # None = somma delle voci
    note          = Column(Text)
    attivo        = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    voci          = relationship("VoceMenu", secondary=menu_voci, lazy="joined")

    def to_dict(self):
        return {"id":self.id,"outlet_id":self.outlet_id,"nome":self.nome,
                "data":self.data,"prezzo_fisso":self.prezzo_fisso,"note":self.note,
                "attivo":self.attivo,"created_at":str(self.created_at),
                "voci":[v.to_dict() for v in self.voci]}


class Prenotazione(Base):
    __tablename__ = "prenotazioni"
    id         = Column(Integer, primary_key=True)
    outlet_id  = Column(Integer, ForeignKey("outlets.id"), nullable=False)
    sala_id    = Column(Integer, nullable=True)
    tavolo_id        = Column(Integer, ForeignKey("tavoli.id"), nullable=True)
    tavolo_unito_id  = Column(Integer, nullable=True)  # secondary table in union
    turno_id         = Column(Integer, nullable=True)
    data       = Column(String(10), nullable=False)
    orario     = Column(String(5), nullable=False)
    servizio   = Column(String(30), default="Cena")
    nome       = Column(String(100), nullable=False)
    telefono   = Column(String(30))
    email      = Column(String(100))
    coperti    = Column(Integer, default=2)
    note       = Column(Text)
    confermata = Column(Boolean, default=True)
    is_vip     = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    tavolo     = relationship("Tavolo", back_populates="prenotazioni")

    def to_dict(self):
        return {"id":self.id,"outlet_id":self.outlet_id,"sala_id":self.sala_id,
                "tavolo_id":self.tavolo_id,"tavolo_unito_id":self.tavolo_unito_id,"turno_id":self.turno_id,
                "data":self.data,"orario":self.orario,"servizio":self.servizio,
                "nome":self.nome,"telefono":self.telefono,"email":self.email,
                "coperti":self.coperti,"note":self.note,"confermata":self.confermata,
                "is_vip":getattr(self,"is_vip",False) or False,"created_at":str(self.created_at)}


class Comanda(Base):
    __tablename__ = "comande"
    id            = Column(Integer, primary_key=True)
    tavolo_id     = Column(Integer, ForeignKey("tavoli.id"), nullable=True)   # nullable: outlet senza tavoli
    turno_id      = Column(Integer, nullable=True)
    outlet_id     = Column(Integer, ForeignKey("outlets.id"), nullable=True)
    cat_cliente_id= Column(Integer, ForeignKey("categorie_cliente.id"), nullable=True)
    numero        = Column(String(10))
    status        = Column(String(30), default="aperta")
    coperti       = Column(Integer, default=0)
    note          = Column(Text)
    totale        = Column(Float, default=0.0)
    tipo_chiusura    = Column(String(30))
    created_at       = Column(DateTime, default=datetime.utcnow)
    closed_at        = Column(DateTime, nullable=True)
    inviato_monitor  = Column(Boolean, default=False)  # True after first "Invia Comanda"
    turno_corrente   = Column(Integer, default=0)       # current turno index shown on monitor (0-based)
    tavolo        = relationship("Tavolo", back_populates="comande")
    righe         = relationship("RigaComanda", back_populates="comanda", cascade="all, delete-orphan")

    def to_dict(self):
        return {"id":self.id,"tavolo_id":self.tavolo_id,"turno_id":self.turno_id,
                "numero":self.numero,"status":self.status,"coperti":self.coperti,
                "note":self.note,"totale":self.totale,"tipo_chiusura":self.tipo_chiusura,
                "created_at":str(self.created_at),"closed_at":str(self.closed_at) if self.closed_at else None,
                "righe":[r.to_dict() for r in self.righe],"inviato_monitor":bool(self.inviato_monitor),"turno_corrente":self.turno_corrente or 0}


class RigaComanda(Base):
    __tablename__ = "righe_comanda"
    id              = Column(Integer, primary_key=True)
    comanda_id      = Column(Integer, ForeignKey("comande.id"), nullable=False)
    voce_id         = Column(Integer, ForeignKey("voci_menu.id"), nullable=False)
    nome_snapshot   = Column(String(200))
    prezzo_snapshot = Column(Float)
    quantita        = Column(Integer, default=1)
    note            = Column(Text)
    turno_idx       = Column(Integer, default=0)  # which turno (0-based separator index)
    comanda         = relationship("Comanda", back_populates="righe")

    def to_dict(self):
        return {"id":self.id,"comanda_id":self.comanda_id,"voce_id":self.voce_id,
                "nome_snapshot":self.nome_snapshot,"prezzo_snapshot":self.prezzo_snapshot,
                "quantita":self.quantita,"note":self.note,"turno_idx":self.turno_idx or 0}


# ══════════════════════════════════════════════════════════════════════════════
# STAMPANTI
# ══════════════════════════════════════════════════════════════════════════════

class Stampante(Base):
    __tablename__ = "stampanti"
    id          = Column(Integer, primary_key=True)
    nome        = Column(String(100), nullable=False)
    ip_address  = Column(String(50))
    protocollo  = Column(String(50), default="epson")   # epson | star | generic | escpos
    tipo        = Column(String(50), default="produzione") # fiscale | produzione
    outlet_id   = Column(Integer, ForeignKey("outlets.id"), nullable=True)
    attiva      = Column(Boolean, default=True)

    def to_dict(self):
        return {"id":self.id,"nome":self.nome,"ip_address":self.ip_address,
                "protocollo":self.protocollo,"tipo":self.tipo,
                "outlet_id":self.outlet_id,"attiva":self.attiva}


class VoceMenuStampante(Base):
    """Links a voce menu to a printer for a specific outlet and context."""
    __tablename__ = "voce_menu_stampanti"
    id          = Column(Integer, primary_key=True)
    voce_id     = Column(Integer, ForeignKey("voci_menu.id",  ondelete="CASCADE"), nullable=False)
    stampante_id= Column(Integer, ForeignKey("stampanti.id",  ondelete="CASCADE"), nullable=False)
    outlet_id   = Column(Integer, ForeignKey("outlets.id",    ondelete="CASCADE"), nullable=False)
    contesto    = Column(String(50), default="reparto_produzione")  # reparto_produzione | chiusura_comanda


# ══════════════════════════════════════════════════════════════════════════════
# AUTH — Ruoli, Permessi, Utenti, Sessioni
# ══════════════════════════════════════════════════════════════════════════════


class Monitor(Base):
    """KDS Monitor per reparto di produzione."""
    __tablename__ = "monitor"
    id            = Column(Integer, primary_key=True)
    nome          = Column(String(100), nullable=False)
    reparto       = Column(String(50), default="cucina")  # cucina|bar|pasticceria|gelateria|custom
    outlet_id     = Column(Integer, ForeignKey("outlets.id"), nullable=True)
    slug          = Column(String(100), unique=True)       # URL-safe identifier
    colore_sfondo = Column(String(20), default="#1a1a2e")
    colore_testo  = Column(String(20), default="#ffffff")
    colore_griglia= Column(String(20), default="#2a2a3e")  # inner card/grid background color
    colore_header = Column(String(20), default="#ffffff")  # top-bar text color (nome, orario)
    attivo        = Column(Boolean, default=True)

    def to_dict(self):
        return {"id":self.id,"nome":self.nome,"reparto":self.reparto,
                "outlet_id":self.outlet_id,"slug":self.slug,
                "colore_sfondo":self.colore_sfondo,"colore_testo":self.colore_testo,
                "colore_griglia":self.colore_griglia or self.colore_sfondo,"colore_header":self.colore_header or "#ffffff",
                "attivo":self.attivo}


class VoceMenuMonitor(Base):
    """Links a VoceMenu to a Monitor reparto (many-to-many).
    tutti_monitor=True means show on ALL monitors regardless of reparto."""
    __tablename__ = "voce_menu_monitor"
    id            = Column(Integer, primary_key=True)
    voce_id       = Column(Integer, ForeignKey("voci_menu.id", ondelete="CASCADE"), nullable=False)
    monitor_id    = Column(Integer, ForeignKey("monitor.id",    ondelete="CASCADE"), nullable=True)
    tutti_monitor = Column(Boolean, default=False)  # True = show on all monitors


# ══════════════════════════════════════════════════════════════════════════════
# WEB MENU — menu digitale accessibile via URL / QR code
# ══════════════════════════════════════════════════════════════════════════════

class WebMenu(Base):
    """Configurazione di un menu web pubblicabile via URL."""
    __tablename__ = "web_menu"
    id              = Column(Integer, primary_key=True)
    nome            = Column(String(100), nullable=False)          # nome interno
    slug            = Column(String(100), unique=True)             # URL-safe: /menu/{slug}
    outlet_id       = Column(Integer, ForeignKey("outlets.id"), nullable=True)
    # Personalizzazione template
    titolo          = Column(String(200))                          # titolo visibile
    sottotitolo     = Column(String(500))                          # tagline/descrizione
    logo_url        = Column(Text)                                 # URL logo (esterno o base64)
    colore_primario = Column(String(20), default="#204769")
    colore_sfondo   = Column(String(20), default="#f8f9fa")
    colore_testo    = Column(String(20), default="#1a1a2a")
    colore_card     = Column(String(20), default="#ffffff")
    font_famiglia   = Column(String(100), default="'Inter','Segoe UI',sans-serif")
    mostra_prezzi   = Column(Boolean, default=True)
    mostra_allergeni= Column(Boolean, default=True)
    nota_piede      = Column(Text)                                 # note in fondo (allergeni, IVA ecc)
    attivo          = Column(Boolean, default=True)
    data_dal        = Column(String(10), nullable=True)            # YYYY-MM-DD validità da
    data_al         = Column(String(10), nullable=True)            # YYYY-MM-DD validità a
    servizio        = Column(String(50), nullable=True)            # Colazione|Pranzo|Cena|Tutti
    voci            = relationship("WebMenuVoce", back_populates="web_menu",
                                   cascade="all,delete-orphan")

    def to_dict(self):
        return {"id":self.id,"nome":self.nome,"slug":self.slug,"outlet_id":self.outlet_id,
                "titolo":self.titolo,"sottotitolo":self.sottotitolo,"logo_url":self.logo_url,
                "colore_primario":self.colore_primario,"colore_sfondo":self.colore_sfondo,
                "colore_testo":self.colore_testo,"colore_card":self.colore_card,
                "font_famiglia":self.font_famiglia,
                "mostra_prezzi":bool(self.mostra_prezzi),"mostra_allergeni":bool(self.mostra_allergeni),
                "nota_piede":self.nota_piede,"attivo":bool(self.attivo),"data_dal":self.data_dal,"data_al":self.data_al,"servizio":self.servizio,
                "voci":[v.to_dict() for v in self.voci]}


class WebMenuVoce(Base):
    """Voce/piatto inserita nel web menu, con categoria come raggruppamento."""
    __tablename__ = "web_menu_voci"
    id           = Column(Integer, primary_key=True)
    web_menu_id  = Column(Integer, ForeignKey("web_menu.id", ondelete="CASCADE"), nullable=False)
    voce_menu_id = Column(Integer, ForeignKey("voci_menu.id", ondelete="SET NULL"), nullable=True)
    # Dati propri (override o custom)
    categoria    = Column(String(100), nullable=False)             # raggruppamento visibile
    nome         = Column(String(200), nullable=False)
    descrizione  = Column(Text)
    prezzo       = Column(Float)
    allergeni    = Column(String(500))                             # es "A,B,G"
    etichette    = Column(String(200))                             # "Vegano,Senza glutine"
    immagine_url = Column(Text)
    ordine       = Column(Integer, default=0)
    web_menu     = relationship("WebMenu", back_populates="voci")

    def to_dict(self):
        return {"id":self.id,"web_menu_id":self.web_menu_id,"voce_menu_id":self.voce_menu_id,
                "categoria":self.categoria,"nome":self.nome,"descrizione":self.descrizione,
                "prezzo":self.prezzo,"allergeni":self.allergeni,"etichette":self.etichette,
                "immagine_url":self.immagine_url,"ordine":self.ordine}


# ══════════════════════════════════════════════════════════════════════════════
# WALLET VIRTUALE — carta monetica nominativa
# ══════════════════════════════════════════════════════════════════════════════

class Cliente(Base):
    """Anagrafica cliente per wallet e identificazione camera."""
    __tablename__ = "clienti"
    id                    = Column(Integer, primary_key=True)
    nome                  = Column(String(100), nullable=False)
    cognome               = Column(String(100), default="")
    email                 = Column(String(200), default="")
    telefono              = Column(String(50), default="")
    note                  = Column(Text, default="")
    categoria_cliente_id  = Column(Integer, ForeignKey("categorie_cliente.id"), nullable=True)
    created_at            = Column(DateTime, default=datetime.utcnow)
    wallets               = relationship("Wallet", back_populates="cliente", cascade="all,delete-orphan")

    def to_dict(self):
        return {"id":self.id,"nome":self.nome,"cognome":self.cognome,
                "email":self.email,"telefono":self.telefono,"note":self.note,
                "categoria_cliente_id":self.categoria_cliente_id,
                "created_at":str(self.created_at) if self.created_at else None}


class Wallet(Base):
    """Conto/wallet digitale nominativo con QR code."""
    __tablename__ = "wallets"
    id             = Column(Integer, primary_key=True)
    cliente_id     = Column(Integer, ForeignKey("clienti.id", ondelete="CASCADE"), nullable=False)
    outlet_id      = Column(Integer, ForeignKey("outlets.id"), nullable=True)
    etichetta      = Column(String(100), default="Wallet")   # es. "Soggiorno Luglio"
    saldo          = Column(Float, default=0.0)
    token          = Column(String(64), unique=True)          # token nel QR code
    attivo         = Column(Boolean, default=True)
    data_scadenza  = Column(String(10), nullable=True)        # YYYY-MM-DD opzionale
    created_at     = Column(DateTime, default=datetime.utcnow)
    cliente        = relationship("Cliente", back_populates="wallets")
    transazioni    = relationship("WalletTransazione", back_populates="wallet",
                                  cascade="all,delete-orphan")

    def to_dict(self):
        return {"id":self.id,"cliente_id":self.cliente_id,"outlet_id":self.outlet_id,
                "etichetta":self.etichetta,"saldo":round(self.saldo or 0, 2),
                "token":self.token,"attivo":bool(self.attivo),
                "data_scadenza":self.data_scadenza,
                "created_at":str(self.created_at) if self.created_at else None,
                "cliente":{"nome":self.cliente.nome,"cognome":self.cliente.cognome,
                            "email":self.cliente.email,
                            "categoria_cliente_id":self.cliente.categoria_cliente_id
                           } if self.cliente else None}


class WalletTransazione(Base):
    """Movimento del wallet: ricarica, pagamento, storno."""
    __tablename__ = "wallet_transazioni"
    id          = Column(Integer, primary_key=True)
    wallet_id   = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    tipo        = Column(String(20), nullable=False)   # ricarica|pagamento|storno
    importo     = Column(Float, nullable=False)         # positivo=ricarica, negativo=pagamento
    note        = Column(String(500), default="")
    comanda_id  = Column(Integer, ForeignKey("comande.id"), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)
    wallet      = relationship("Wallet", back_populates="transazioni")

    def to_dict(self):
        return {"id":self.id,"wallet_id":self.wallet_id,"tipo":self.tipo,
                "importo":round(self.importo,2),"note":self.note,"comanda_id":self.comanda_id,
                "created_at":str(self.created_at) if self.created_at else None}


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURAZIONE EMAIL SMTP
# ══════════════════════════════════════════════════════════════════════════════
class ConfigEmail(Base):
    """Configurazione SMTP per invio email dal gestionale (riga singola, id=1)."""
    __tablename__ = "config_email"
    id             = Column(Integer, primary_key=True)
    smtp_host      = Column(String(200), default="")
    smtp_port      = Column(Integer,     default=587)
    smtp_user      = Column(String(200), default="")
    smtp_password  = Column(String(500), default="")
    smtp_from_email= Column(String(200), default="")
    smtp_from_name = Column(String(200), default="Outlet Manager")
    use_tls        = Column(Boolean,     default=True)
    use_ssl        = Column(Boolean,     default=False)
    attivo         = Column(Boolean,     default=False)

    def to_dict(self):
        return {"id":self.id,"smtp_host":self.smtp_host,"smtp_port":self.smtp_port,
                "smtp_user":self.smtp_user,
                "smtp_password":"***" if self.smtp_password else "",
                "smtp_from_email":self.smtp_from_email,"smtp_from_name":self.smtp_from_name,
                "use_tls":bool(self.use_tls),"use_ssl":bool(self.use_ssl),
                "attivo":bool(self.attivo)}

    def to_dict_full(self):
        d = self.to_dict(); d["smtp_password"] = self.smtp_password; return d


# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURAZIONE MOBILE WALLET (Apple + Google)
# ══════════════════════════════════════════════════════════════════════════════
class ConfigMobileWallet(Base):
    """Configurazione per Apple Wallet e Google Wallet (riga singola, id=1)."""
    __tablename__ = "config_mobile_wallet"
    id                      = Column(Integer, primary_key=True)
    # Apple Wallet
    apple_enabled           = Column(Boolean, default=False)
    apple_team_id           = Column(String(20),  default="")
    apple_pass_type_id      = Column(String(200), default="")
    apple_org_name          = Column(String(200), default="")
    apple_cert_pem          = Column(Text, default="")   # contenuto file certificate.pem
    apple_key_pem           = Column(Text, default="")   # contenuto file key.pem
    apple_key_password      = Column(String(200), default="")
    apple_wwdr_pem          = Column(Text, default="")   # WWDR cert (scaricabile da Apple)
    # Google Wallet
    google_enabled          = Column(Boolean, default=False)
    google_issuer_id        = Column(String(100), default="")
    google_class_id         = Column(String(200), default="")
    google_service_account  = Column(Text, default="")   # JSON della service account

    def to_dict(self):
        return {
            "id": self.id,
            "apple_enabled": bool(self.apple_enabled),
            "apple_team_id": self.apple_team_id,
            "apple_pass_type_id": self.apple_pass_type_id,
            "apple_org_name": self.apple_org_name,
            "apple_cert_pem": "***" if self.apple_cert_pem else "",
            "apple_key_pem": "***" if self.apple_key_pem else "",
            "apple_key_password": "***" if self.apple_key_password else "",
            "apple_wwdr_pem": "***" if self.apple_wwdr_pem else "",
            "google_enabled": bool(self.google_enabled),
            "google_issuer_id": self.google_issuer_id,
            "google_class_id": self.google_class_id,
            "google_service_account": "***" if self.google_service_account else "",
        }

# Pagine disponibili per la gestione permessi
PAGINE_SISTEMA = [
    # (id, label, sezione)
    ("sala",          "Sala Ristorante",    "Operativo"),
    ("prenotazioni",  "Prenotazioni",       "Operativo"),
    ("gestione",      "Gestione Sala",      "Operativo"),
    ("ospiti",        "Ospiti del Giorno",  "Operativo"),
    ("outlets",       "Outlet",             "Struttura"),
    ("sale",          "Sale e Tavoli",      "Struttura"),
    ("turni",         "Turni",              "Struttura"),
    ("tipi-menu",     "Tipi Menu",          "Menu"),
    ("categorie-menu","Categorie Menu",     "Menu"),
    ("voci-menu",     "Voci Menu",          "Menu"),
    ("menu-giorno",   "Menu del Giorno",    "Menu"),
    ("allergeni",     "Allergeni",          "Generali"),
    ("config-email",  "Configurazione Email","Generali"),
    ("mobile-wallet", "Mobile Wallet",      "Generali"),
    ("cat-cliente",   "Categorie Cliente",  "Generali"),
    ("stampanti",     "Stampanti",          "Generali"),
    ("monitor",        "Service Monitor",    "Generali"),
    ("utenti",        "Utenti",             "Amministrazione"),
    ("wallets",       "Wallet Clienti",     "Amministrazione"),
    ("ruoli",         "Ruoli e Permessi",   "Amministrazione"),
]


class Ruolo(Base):
    __tablename__ = "ruoli"
    id          = Column(Integer, primary_key=True)
    nome        = Column(String(80), nullable=False, unique=True)
    descrizione = Column(Text)
    is_admin    = Column(Boolean, default=False)   # accesso totale
    created_at  = Column(DateTime, default=datetime.utcnow)
    permessi    = relationship("PermessoRuolo", back_populates="ruolo", cascade="all, delete-orphan")
    utenti      = relationship("Utente", back_populates="ruolo")

    def to_dict(self, include_permessi=False):
        d = {"id": self.id, "nome": self.nome, "descrizione": self.descrizione,
             "is_admin": self.is_admin, "created_at": str(self.created_at)}
        if include_permessi:
            d["permessi"] = {p.pagina: p.accesso for p in self.permessi}
        return d


class PermessoRuolo(Base):
    __tablename__ = "permessi_ruolo"
    id      = Column(Integer, primary_key=True)
    ruolo_id= Column(Integer, ForeignKey("ruoli.id"), nullable=False)
    pagina  = Column(String(50), nullable=False)
    accesso = Column(String(20), default="nascosta")   # nascosta | lettura | completa
    ruolo   = relationship("Ruolo", back_populates="permessi")

    def to_dict(self):
        return {"id": self.id, "ruolo_id": self.ruolo_id, "pagina": self.pagina, "accesso": self.accesso}


class Utente(Base):
    __tablename__ = "utenti"
    id           = Column(Integer, primary_key=True)
    username     = Column(String(60), nullable=False, unique=True)
    email        = Column(String(120))
    full_name    = Column(String(120))
    password_hash= Column(String(256), nullable=False)
    ruolo_id     = Column(Integer, ForeignKey("ruoli.id"), nullable=True)
    attivo       = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)
    last_login   = Column(DateTime, nullable=True)
    ruolo        = relationship("Ruolo", back_populates="utenti")
    sessioni     = relationship("Sessione", back_populates="utente", cascade="all, delete-orphan")

    def set_password(self, pwd):
        self.password_hash = generate_password_hash(pwd)

    def check_password(self, pwd):
        return check_password_hash(self.password_hash, pwd)

    def to_dict(self):
        return {"id": self.id, "username": self.username, "email": self.email,
                "full_name": self.full_name, "ruolo_id": self.ruolo_id,
                "ruolo_nome": self.ruolo.nome if self.ruolo else None,
                "is_admin": self.ruolo.is_admin if self.ruolo else False,
                "attivo": self.attivo,
                "created_at": str(self.created_at),
                "last_login": str(self.last_login) if self.last_login else None}


class Sessione(Base):
    __tablename__ = "sessioni"
    id         = Column(Integer, primary_key=True)
    token      = Column(String(64), unique=True, nullable=False)
    utente_id  = Column(Integer, ForeignKey("utenti.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    utente     = relationship("Utente", back_populates="sessioni")

    @staticmethod
    def new_token():
        return secrets.token_hex(32)
