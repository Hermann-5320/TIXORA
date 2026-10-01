FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -B -Dmaven.wagon.http.retryHandler.count=10 -Dmaven.wagon.httpconnectionManager.ttlSeconds=30 dependency:go-offline
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -q -B -Dmaven.wagon.http.retryHandler.count=10 -Dmaven.wagon.httpconnectionManager.ttlSeconds=30 -DskipTests package

FROM eclipse-temurin:21-jre
RUN useradd --system --no-create-home appuser
WORKDIR /app
COPY --from=build /app/target/tixora-api-1.0.0.jar app.jar
USER appuser
EXPOSE 8080
# Petites instances (512 Mo) : la JVM n'utilise par defaut que 25 % de la memoire, on lui laisse 70 %
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "app.jar"]
