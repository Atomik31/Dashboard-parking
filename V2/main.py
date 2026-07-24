#!/usr/bin/env python3
"""
Mon super Dashboard 2 
test du template 

Auteur: JC <j.chr@gmail.com>
"""

import sys
from pathlib import Path

# Ajouter le dossier src au PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent / "src"))

import streamlit as st

# Configuration de la page
st.set_page_config(
    page_title="Mon super Dashboard 2 ",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Definition des pages avec navigation top
pages = [
    st.Page(
        "src/test_dashboard/pages/1_home.py",
        title="Accueil",
        icon=":material/home:",
        default=True
    ),
    st.Page(
        "src/test_dashboard/pages/2_dashboard.py",
        title="Dashboard",
        icon=":material/insert_chart:"
    ),
    st.Page(
        "src/test_dashboard/pages/3_settings.py",
        title="Parametres",
        icon=":material/settings:"
    ),
]

# Navigation en position top
page = st.navigation(pages, position="top")

# Execution de la page
page.run()