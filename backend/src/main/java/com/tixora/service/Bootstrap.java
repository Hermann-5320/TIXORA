package com.tixora.service;

import com.tixora.model.Const;
import com.tixora.model.Event;
import com.tixora.model.EventLike;
import com.tixora.model.TicketType;
import com.tixora.model.User;
import com.tixora.repository.EventLikeRepository;
import com.tixora.repository.EventRepository;
import com.tixora.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Donnees de depart : compte administrateur (variables ADMIN_EMAIL / ADMIN_PASSWORD) et demo optionnelle (SEED_DEMO=true). */
@Component
public class Bootstrap implements ApplicationRunner {
  private static final Logger log = LoggerFactory.getLogger(Bootstrap.class);
  static final String DEMO_PASSWORD = "Demo12345!";

  private final UserRepository users;
  private final EventRepository events;
  private final EventLikeRepository likes;
  private final PasswordEncoder encoder;
  private final EventRules rules;
  private final String adminEmail;
  private final String adminPassword;
  private final boolean seedDemo;

  public Bootstrap(UserRepository users, EventRepository events, EventLikeRepository likes, PasswordEncoder encoder,
                   EventRules rules, @Value("${app.admin-email}") String adminEmail,
                   @Value("${app.admin-password}") String adminPassword, @Value("${app.seed-demo}") boolean seedDemo) {
    this.users = users;
    this.events = events;
    this.likes = likes;
    this.encoder = encoder;
    this.rules = rules;
    this.adminEmail = adminEmail == null ? "" : adminEmail.trim().toLowerCase();
    this.adminPassword = adminPassword == null ? "" : adminPassword;
    this.seedDemo = seedDemo;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    createAdmin();
    if (seedDemo && events.count() == 0) createDemo();
  }

  private void createAdmin() {
    if (adminEmail.isEmpty()) return;
    if (adminPassword.length() < 8) {
      log.warn("ADMIN_PASSWORD trop court (8 caracteres minimum) : compte administrateur non cree");
      return;
    }
    if (users.existsByEmail(adminEmail)) return;
    User a = newUser("Admin", "Tixora", adminEmail, adminPassword, "ADMIN");
    users.save(a);
    log.info("Compte administrateur cree : {}", adminEmail);
  }

  private User newUser(String first, String last, String email, String password, String role) {
    User u = new User();
    u.firstName = first;
    u.lastName = last;
    u.email = email;
    u.passwordHash = encoder.encode(password);
    u.role = role;
    return u;
  }

  private void createDemo() {
    User org = newUser("Studio", "Tixora", "organisateur@tixora.demo", DEMO_PASSWORD, "ORGANISATEUR");
    org.organization = "Tixora Live";
    org.phone = "+237600000000";
    users.save(org);
    User client = users.save(newUser("Awa", "Client", "client@tixora.demo", DEMO_PASSWORD, "CLIENT"));

    LocalDateTime d = rules.now().withHour(18).withMinute(0).withSecond(0).withNano(0);
    List<Event> demo = List.of(
        demoEvent(org, "Festival Yaoundé Live", "MUSIQUE", "Palais des Sports de Warda", "Yaoundé", 3.8836, 11.5270, d.plusDays(12),
            "Une nuit de concerts avec les grandes voix du Cameroun.", Const.APPROVED, new Object[][]{{"Classique", 4000, 800}, {"VIP", 15000, 120}}),
        demoEvent(org, "Douala Tech Summit", "TECH", "Hôtel Sawa", "Douala", 4.0511, 9.7679, d.plusDays(20),
            "Conférences, ateliers et networking autour de l'IA et du cloud.", Const.APPROVED, new Object[][]{{"Standard", 5000, 300}, {"Pass Pro", 20000, 60}}),
        demoEvent(org, "Kribi Beach Party", "GALA", "Plage de Mpalla", "Kribi", 2.9400, 9.9100, d.plusDays(31),
            "Soirée sur la plage, DJ sets et feu d'artifice.", Const.APPROVED, new Object[][]{{"Entrée", 3000, 500}, {"Carré VIP", 25000, 40}}),
        demoEvent(org, "Les Saveurs du Cameroun", "GASTRONOMIE", "Musée National", "Yaoundé", 3.8667, 11.5167, d.plusDays(8),
            "Festival de la gastronomie et des terroirs.", Const.APPROVED, new Object[][]{{"Dégustation", 6500, 250}}),
        demoEvent(org, "Derby de la Réunification", "SPORT", "Stade de la Réunification", "Douala", 4.0730, 9.7300, d.plusDays(15),
            "Le grand derby de la saison.", Const.APPROVED, new Object[][]{{"Tribune", 2000, 1500}, {"Loge", 12000, 100}}),
        demoEvent(org, "Nuit de la Culture Bamiléké", "CULTURE", "Place des Fêtes", "Bafoussam", 5.4737, 10.4179, d.plusDays(25),
            "Danses, contes et art traditionnel des Grassfields.", Const.APPROVED, new Object[][]{{"Public", 1500, 700}}),
        demoEvent(org, "Forum Business Afrique Centrale", "BUSINESS", "Palais des Congrès", "Yaoundé", 3.8792, 11.5183, d.plusDays(40),
            "Rencontres entre entrepreneurs, investisseurs et institutions.", Const.APPROVED, new Object[][]{{"Participant", 10000, 400}}),
        // Evenement termine : verrouille (ni vente, ni modification par l'organisateur).
        demoEvent(org, "Gala d'ouverture de la saison (terminé)", "GALA", "Hôtel Hilton", "Yaoundé", 3.8650, 11.5210, d.minusDays(10),
            "Soirée de gala de la saison précédente.", Const.APPROVED, new Object[][]{{"Table", 50000, 30}}),
        // En attente de validation : visible seulement par l'organisateur et l'admin.
        demoEvent(org, "Concert Gospel de Noël", "MUSIQUE", "Cathédrale Notre-Dame", "Douala", 4.0483, 9.7043, d.plusDays(60),
            "Grand concert de chorales.", Const.PENDING, new Object[][]{{"Entrée", 2500, 900}})
    );
    String[] templates = {"FESTIVAL", "MODERN", "FESTIVAL", "CLASSIC", "MODERN", "MINIMAL", "CLASSIC", "CLASSIC", "MINIMAL"};
    String[] colors = {"#e11d74", "#2563eb", "#f59e0b", "#ea580c", "#16a34a", "#9333ea", "#0f766e", "#c026d3", "#475569"};
    for (int i = 0; i < demo.size(); i++) {
      demo.get(i).ticketTemplate = templates[i];
      demo.get(i).ticketColor = colors[i];
    }
    demo.get(0).ticketMessage = "Bonne soirée et merci de votre présence !";
    List<Event> saved = events.saveAll(demo);
    for (int i = 0; i < 4; i++) {
      EventLike l = new EventLike();
      l.userId = client.id;
      l.eventId = saved.get(i).id;
      likes.save(l);
    }
    log.info("Demo creee : organisateur@tixora.demo et client@tixora.demo (mot de passe {})", DEMO_PASSWORD);
  }

  private Event demoEvent(User org, String title, String category, String venue, String city, double lat, double lng,
                          LocalDateTime start, String description, String status, Object[][] types) {
    Event e = new Event();
    e.title = title;
    e.category = category;
    e.venue = venue;
    e.city = city;
    e.latitude = lat;
    e.longitude = lng;
    e.startsAt = start;
    e.description = description;
    e.status = status;
    e.organizerId = org.id;
    for (Object[] t : types) {
      TicketType type = new TicketType();
      type.name = (String) t[0];
      type.price = (Integer) t[1];
      type.capacity = (Integer) t[2];
      type.event = e;
      e.ticketTypes.add(type);
    }
    return e;
  }
}
