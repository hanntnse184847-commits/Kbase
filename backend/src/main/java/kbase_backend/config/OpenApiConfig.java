package kbase_backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

        private static final String BEARER_SCHEME_NAME = "bearerAuth";

        @Bean
        public OpenAPI kbaseOpenAPI() {
                return new OpenAPI()
                                .info(new Info()
                                                .title("KBase API")
                                                .description("Project knowledge base: users, projects, and document storage")
                                                .version("v1"))
                                // Applies the "bearerAuth" scheme to every endpoint by default, so
                                // Swagger UI's padlock icons and the Authorize button work out of
                                // the box without annotating each controller method individually.
                                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME_NAME))
                                .components(new Components()
                                                .addSecuritySchemes(BEARER_SCHEME_NAME, new SecurityScheme()
                                                                .name(BEARER_SCHEME_NAME)
                                                                .type(SecurityScheme.Type.HTTP)
                                                                .scheme("bearer")
                                                                .bearerFormat("JWT")));
        }
}