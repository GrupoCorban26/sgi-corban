IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[comercial].[historial_llamadas]') AND type in (N'U'))
BEGIN
    CREATE TABLE [comercial].[historial_llamadas](
        [id] [int] IDENTITY(1,1) NOT NULL,
        [contacto_id] [int] NOT NULL,
        [ruc] [varchar](11) NOT NULL,
        [comercial_id] [int] NOT NULL,
        [caso_id] [int] NOT NULL,
        [comentario] [varchar](500) NULL,
        [fecha_llamada] [datetime2](7) NULL DEFAULT (SYSDATETIME()),
        CONSTRAINT [PK_historial_llamadas] PRIMARY KEY CLUSTERED 
        (
            [id] ASC
        )
    );

    ALTER TABLE [comercial].[historial_llamadas]  WITH CHECK ADD  CONSTRAINT [FK_historial_llamadas_contactos] FOREIGN KEY([contacto_id])
    REFERENCES [comercial].[cliente_contactos] ([id])
    ON DELETE CASCADE;

    ALTER TABLE [comercial].[historial_llamadas] CHECK CONSTRAINT [FK_historial_llamadas_contactos];

    ALTER TABLE [comercial].[historial_llamadas]  WITH CHECK ADD  CONSTRAINT [FK_historial_llamadas_usuarios] FOREIGN KEY([comercial_id])
    REFERENCES [seg].[usuarios] ([id]);

    ALTER TABLE [comercial].[historial_llamadas] CHECK CONSTRAINT [FK_historial_llamadas_usuarios];

    ALTER TABLE [comercial].[historial_llamadas]  WITH CHECK ADD  CONSTRAINT [FK_historial_llamadas_casos] FOREIGN KEY([caso_id])
    REFERENCES [comercial].[casos_llamada] ([id]);

    ALTER TABLE [comercial].[historial_llamadas] CHECK CONSTRAINT [FK_historial_llamadas_casos];
END
GO
