"""
Composant Footer - Informations en bas de page
"""

import streamlit as st
from datetime import datetime

def render_footer():
    """Affiche le footer avec informations."""
    
    st.markdown("---")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.caption(f":material/copyright: 2026 Mon super Dashboard 2  | v1.0.0")
    
    with col2:
        st.caption(f":material/code: Developpe par Julien CHR")
    
    with col3:
        st.caption(f":material/calendar_today: {datetime.now().strftime('%d/%m/%Y %H:%M')}")