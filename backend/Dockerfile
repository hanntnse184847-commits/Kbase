# --- Build stage ---
# Uses an image with Maven already installed, so we don't rely on the
# project's own mvnw wrapper (which needs network access to fetch itself).
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy just the POM first so Docker can cache the downloaded dependencies
# in their own layer — they only get re-downloaded if pom.xml changes,
# not on every source code change.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline || true

COPY src src
RUN mvn -q -B -DskipTests package

# --- Runtime stage ---
# Much smaller image: just a JRE (no Maven, no build tools) plus the jar.
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
