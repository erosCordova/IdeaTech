import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  AuthChangeEvent,
  AuthError,
  Session,
  User,
} from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import type { Perfil } from "../types/database";

interface ResultadoAutenticacion {
  error: AuthError | null;
}

interface AuthContextType {
  usuario: User | null;
  sesion: Session | null;
  perfil: Perfil | null;
  cargando: boolean;
  estaAutenticado: boolean;

  iniciarSesion: (
    correo: string,
    contrasena: string
  ) => Promise<ResultadoAutenticacion>;

  registrarUsuario: (
    nombreCompleto: string,
    telefono: string,
    correo: string,
    contrasena: string
  ) => Promise<ResultadoAutenticacion>;

  cerrarSesion: () => Promise<ResultadoAutenticacion>;

  recargarPerfil: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [sesion, setSesion] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  const obtenerPerfil = useCallback(
    async (usuarioId: string): Promise<Perfil | null> => {
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", usuarioId)
        .single();

      if (error) {
        console.error(
          "No se pudo obtener el perfil:",
          error.message
        );

        return null;
      }

      return data as Perfil;
    },
    []
  );

  const establecerSesion = useCallback(
    async (sesionActual: Session | null): Promise<void> => {
      setSesion(sesionActual);
      setUsuario(sesionActual?.user ?? null);

      if (!sesionActual?.user) {
        setPerfil(null);
        setCargando(false);
        return;
      }

      const perfilEncontrado = await obtenerPerfil(
        sesionActual.user.id
      );

      setPerfil(perfilEncontrado);
      setCargando(false);
    },
    [obtenerPerfil]
  );

  const recargarPerfil = useCallback(async (): Promise<void> => {
    if (!usuario) {
      setPerfil(null);
      return;
    }

    const perfilActualizado = await obtenerPerfil(usuario.id);
    setPerfil(perfilActualizado);
  }, [obtenerPerfil, usuario]);

  const iniciarSesion = useCallback(
    async (
      correo: string,
      contrasena: string
    ): Promise<ResultadoAutenticacion> => {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: correo.trim().toLowerCase(),
          password: contrasena,
        });

      return { error };
    },
    []
  );

  const registrarUsuario = useCallback(
    async (
      nombreCompleto: string,
      telefono: string,
      correo: string,
      contrasena: string
    ): Promise<ResultadoAutenticacion> => {
      const { error } = await supabase.auth.signUp({
        email: correo.trim().toLowerCase(),
        password: contrasena,
        options: {
          data: {
            nombre_completo: nombreCompleto.trim(),
            telefono: telefono.trim(),
          },
        },
      });

      return { error };
    },
    []
  );

  const cerrarSesion =
    useCallback(async (): Promise<ResultadoAutenticacion> => {
      const { error } = await supabase.auth.signOut();

      if (!error) {
        setSesion(null);
        setUsuario(null);
        setPerfil(null);
      }

      return { error };
    }, []);

  useEffect(() => {
    let componenteActivo = true;

    const cargarSesionInicial = async (): Promise<void> => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error(
          "No se pudo recuperar la sesión:",
          error.message
        );
      }

      if (componenteActivo) {
        await establecerSesion(session);
      }
    };

    void cargarSesionInicial();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (
        _evento: AuthChangeEvent,
        nuevaSesion: Session | null
      ) => {
        window.setTimeout(() => {
          if (componenteActivo) {
            void establecerSesion(nuevaSesion);
          }
        }, 0);
      }
    );

    return () => {
      componenteActivo = false;
      subscription.unsubscribe();
    };
  }, [establecerSesion]);

  const valor = useMemo<AuthContextType>(
    () => ({
      usuario,
      sesion,
      perfil,
      cargando,
      estaAutenticado: Boolean(usuario && sesion),
      iniciarSesion,
      registrarUsuario,
      cerrarSesion,
      recargarPerfil,
    }),
    [
      usuario,
      sesion,
      perfil,
      cargando,
      iniciarSesion,
      registrarUsuario,
      cerrarSesion,
      recargarPerfil,
    ]
  );

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return contexto;
}