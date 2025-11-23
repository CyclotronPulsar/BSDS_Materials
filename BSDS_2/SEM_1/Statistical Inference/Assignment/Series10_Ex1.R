#################################
##### Series 10, Exercise 1 #####
#################################

##### (a) #####
n <- 50
p_0 <- 1/4
alpha <- 0.05

pbinom(c(0:n),n,p_0) ## These are the possible sizes

c <- qbinom(alpha,n,p_0)
pbinom(c,n,p_0) # more than alpha, not b_{alpha;n,p_0}
c <- c-1
pbinom(c,n,p_0) ## this is our b_{alpha;n,p_0}
c_left <- c+1
print(c_left)

beta_left <- function(p){ # power function of the left-sided test
  pbinom(c_left-1,n,p)
}

curve(beta_left, frame=FALSE)

c <- qbinom(alpha,n,p_0,lower.tail=FALSE)
pbinom(c,n,p_0,lower.tail=FALSE) # less than alpha
pbinom(c-1,n,p_0,lower.tail=FALSE) # more than alpha
c_right <- c
print(c_right)

beta_right <- function(p){ # power function of the right-tailed test
  1 - pbinom(c_right,n,p)
}

curve(beta_right, frame=FALSE)

alpha1 <- alpha/2
alpha2 <- alpha/2
c1 <- qbinom(alpha1,n,p_0)
c2 <- qbinom(alpha2,n,p_0, lower.tail=FALSE)
pbinom(c1-1,n,p_0)
pbinom(c2,n,p_0,lower.tail=FALSE)

beta_both <- function(p){ #power function of the two-sided test
  pbinom(c1-1,n,p) + 1 - pbinom(c2,n,p)
}

curve(beta_both, frame=FALSE)

p <- seq(0,1,,100)
power_left <- sapply(p,beta_left)
power_right <- sapply(p,beta_right)
power_both <- sapply(p,beta_both)

plot(p,power_left,col="blue",type="l",lwd=1.5,ylim=c(0,1),
     frame=FALSE,xlab="p",ylab="Power",main="Power functions")
lines(p,power_right,col="darkgreen",type="l",lwd=1.5)
lines(p,power_both,col="red",type="l",lwd=1.5)
legend("right",c("Left-sided","Right-sided","Both-sided"),
       col=c("blue","darkgreen","red"),lwd=1.5)

abline(v=p_0,lty=2,col="gray",lwd=1.5)
text(0.35,1,labels=c("p=1/4"))
abline(h=alpha,lty=2,col="gray",lwd=1.5)
text(0.9,0.1,labels=expression(alpha == 0.05))

# phi_left has more power against H_left
# phi_right has more power against H_right
# phi_both has more power against H_both

### Effect of changing alpha1 & alpha2
beta_both2 <- function(p,alpha1){
  alpha2 <- alpha - alpha1
  c1 <- qbinom(alpha1,n,p_0)
  c2 <- qbinom(alpha2,n,p_0, lower.tail=FALSE)  
  pbinom(c1-1,n,p) + 1 - pbinom(c2,n,p)
}
power_both2 <- sapply(p,beta_both2,alpha1=alpha/4)
power_both3 <- sapply(p,beta_both2,alpha1=alpha/8)
power_both4 <- sapply(p,beta_both2,alpha1=3*alpha/4)
power_both5 <- sapply(p,beta_both2,alpha1=7*alpha/8)

plot(p,power_both,col="red",type="l",lwd=1.5,ylim=c(0,1),
     frame=FALSE,xlab="p",ylab="Power",main="Power functions")
lines(p,power_both2,col="blue",type="l",lty=2,lwd=1.5)
lines(p,power_both3,col="green",type="l",lty=2,lwd=1.5)
lines(p,power_both4,col="navy",type="l",lty=3,lwd=1.5)
lines(p,power_both5,col="darkgreen",type="l",lty=3,lwd=1.5)
legend("right",c(expression(alpha[1] == alpha/2),
                 expression(alpha[1] == alpha/4),
                 expression(alpha[1] == alpha/8),
                 expression(alpha[1] == 3*alpha/4),
                 expression(alpha[1] == 7*alpha/8)),
       col=c("red","blue","green","navy","darkgreen"),
       lty=c(1,2,2,3,3),lwd=1.5)

##########################################################
##########################################################
##########################################################

##### (b) #####
n <- 50
lambda_0 <- 2
alpha <- 0.05

c <- qpois(alpha,n*lambda_0)
ppois(c,n*lambda_0) # more than alpha, not b_{alpha;n,p_0}
c <- c-1
ppois(c,n*lambda_0) ## this is our b_{alpha;n,p_0}
c_left <- c+1
print(c_left)

beta_left <- function(lambda){ # power function of the left-sided test
  ppois(c_left-1,n*lambda)
}

curve(beta_left, from=1, to=10, frame=FALSE)

c <- qpois(alpha,n*lambda_0,lower.tail=FALSE)
ppois(c,n*lambda_0,lower.tail=FALSE) # less than alpha
ppois(c-1,n*lambda_0,lower.tail=FALSE) # more than alpha
c_right <- c
print(c_right)

beta_right <- function(lambda){ # power function of the right-tailed test
  1 - ppois(c_right,n*lambda)
}

curve(beta_right, from=1, to=10, frame=FALSE)

alpha1 <- alpha/2
alpha2 <- alpha/2
c1 <- qpois(alpha1,n*lambda_0)
c2 <- qpois(alpha2,n*lambda_0, lower.tail=FALSE)
ppois(c1-1,n*lambda_0)
ppois(c2,n*lambda_0,lower.tail=FALSE)

beta_both <- function(lambda){ #power function of the two-sided test
  ppois(c1-1,n*lambda) + 1 - ppois(c2,n*lambda)
}

curve(beta_both, from=1, to=10, frame=FALSE)

lambda <- seq(0.5,5,,100)
power_left <- sapply(lambda,beta_left)
power_right <- sapply(lambda,beta_right)
power_both <- sapply(lambda,beta_both)

plot(lambda,power_left,col="blue",type="l",lwd=1.5,ylim=c(0,1),
     frame=FALSE,xlab=expression(lambda),ylab="Power",
     main="Power functions")
lines(lambda,power_right,col="darkgreen",type="l",lwd=1.5)
lines(lambda,power_both,col="red",type="l",lwd=1.5)
legend("right",c("Left-sided","Right-sided","Both-sided"),
       col=c("blue","darkgreen","red"),lwd=1.5)

abline(v=lambda_0,lty=2,col="gray",lwd=1.5)
text(2.5,1,labels=expression(lambda == 1/4))
abline(h=alpha,lty=2,col="gray",lwd=1.5)
text(4.5,0.1,labels=expression(alpha == 0.05))

# phi_left has more power against H_left
# phi_right has more power against H_right
# phi_both has more power against H_both

### Effect of changing alpha1 & alpha2
beta_both2 <- function(lambda,alpha1){
  alpha2 <- alpha - alpha1
  c1 <- qpois(alpha1,n*lambda_0)
  c2 <- qpois(alpha2,n*lambda_0, lower.tail=FALSE)  
  ppois(c1-1,n*lambda) + 1 - ppois(c2,n*lambda)
}
power_both2 <- sapply(lambda,beta_both2,alpha1=alpha/4)
power_both3 <- sapply(lambda,beta_both2,alpha1=alpha/8)
power_both4 <- sapply(lambda,beta_both2,alpha1=3*alpha/4)
power_both5 <- sapply(lambda,beta_both2,alpha1=7*alpha/8)

plot(lambda,power_both,col="red",type="l",lwd=1.5,ylim=c(0,1),
     frame=FALSE,xlab=expression(lambda),ylab="Power",
     main="Power functions")
lines(lambda,power_both2,col="blue",type="l",lty=2,lwd=1.5)
lines(lambda,power_both3,col="green",type="l",lty=2,lwd=1.5)
lines(lambda,power_both4,col="navy",type="l",lty=3,lwd=1.5)
lines(lambda,power_both5,col="darkgreen",type="l",lty=3,lwd=1.5)
legend("right",c(expression(alpha[1] == alpha/2),
                 expression(alpha[1] == alpha/4),
                 expression(alpha[1] == alpha/8),
                 expression(alpha[1] == 3*alpha/4),
                 expression(alpha[1] == 7*alpha/8)),
       col=c("red","blue","green","navy","darkgreen"),
       lty=c(1,2,2,3,3),lwd=1.5)

##########################################################
##########################################################
##########################################################

##### (c) #####
theta_0 <- 1
alpha <- 0.05

c_left <- qunif(alpha,0,theta_0)
print(c_left)
punif(c_left,0,theta_0)

beta_left <- function(theta){ # power function of the left-sided test
  punif(c_left,0,theta)
}

curve(beta_left, from=0.5, to=5, frame=FALSE)

c_right <- qunif(alpha,0,theta_0,lower.tail=FALSE)
print(c_right)
punif(c_right,0,theta_0,lower.tail=FALSE)

beta_right <- function(theta){ # power function of the right-tailed test
  1 - punif(c_right,0,theta)
}

curve(beta_right, from=0.5, to=5, frame=FALSE)

alpha1 <- alpha/2
alpha2 <- alpha/2
c1 <- qunif(alpha1,0,theta_0)
c2 <- qunif(alpha2,0,theta_0, lower.tail=FALSE)
print(c1)
print(c2)

beta_both <- function(theta){ #power function of the two-sided test
  punif(c1,0,theta) + 1 - punif(c2,0,theta)
}

curve(beta_both, from=0.1, to=5, frame=FALSE)

theta <- seq(0.1,5,,100)
power_left <- sapply(theta,beta_left)
power_right <- sapply(theta,beta_right)
power_both <- sapply(theta,beta_both)

plot(theta,power_left,col="blue",type="l",lwd=1.5,ylim=c(0,1),
     frame=FALSE,xlab=expression(theta),ylab="Power",
     main="Power functions")
lines(theta,power_right,col="darkgreen",type="l",lwd=1.5)
lines(theta,power_both,col="red",type="l",lwd=1.5)
legend("right",c("Left-sided","Right-sided","Both-sided"),
       col=c("blue","darkgreen","red"),lwd=1.5)

abline(v=theta_0,lty=2,col="gray",lwd=1.5)
text(1.5,1,labels=expression(theta == 1))
abline(h=alpha,lty=2,col="gray",lwd=1.5)
text(4.5,0.1,labels=expression(alpha == 0.05))

# phi_left has more power against H_left
# phi_both has more power against H_both
# phi_right and phi_both seem to have similar power against H_right

##########################################################
##########################################################
##########################################################

##### (d) #####
mu_0 <- 5
alpha <- 0.05

c_left <- 2*mu_0 + sqrt(2)*qnorm(alpha)
print(c_left)
print(qnorm(alpha,mean=2*mu_0,sd=sqrt(2))) # same value
pnorm((c_left-2*mu_0)/sqrt(2))
pnorm(c_left, mean=2*mu_0, sd=sqrt(2)) # same value

beta_left <- function(mu){ # power function of the left-sided test
  pnorm((c_left-2*mu)/sqrt(2))
}

curve(beta_left, from=-5, to=15, frame=FALSE)

c_right <- 2*mu_0 - sqrt(2)*qnorm(alpha)
print(c_right)
print(qnorm(alpha,mean=2*mu_0,sd=sqrt(2),lower.tail=FALSE)) #same value
1-pnorm((c_right-2*mu_0)/sqrt(2))
pnorm(c_right,mean=2*mu_0,sd=sqrt(2),lower.tail=FALSE) #same value

beta_right <- function(mu){ # power function of the right-tailed test
  1 - pnorm((c_right-2*mu)/sqrt(2))
}

curve(beta_right, from=-5, to=15, frame=FALSE)

alpha1 <- alpha/2
alpha2 <- alpha/2
c1 <- 2*mu_0 + sqrt(2)*qnorm(alpha1)
c2 <- 2*mu_0 - sqrt(2)*qnorm(alpha2)
print(c1)
print(c2)

beta_both <- function(mu){ #power function of the two-sided test
  pnorm((c1-2*mu)/sqrt(2)) + 1 - pnorm((c2-2*mu)/sqrt(2))
}

curve(beta_both, from=-5, to=15, frame=FALSE)

mu <- seq(2,8,,100)
power_left <- sapply(mu,beta_left)
power_right <- sapply(mu,beta_right)
power_both <- sapply(mu,beta_both)

plot(mu,power_left,col="blue",type="l",lwd=1.5,ylim=c(0,1),
     frame=FALSE,xlab=expression(mu),ylab="Power",
     main="Power functions")
lines(mu,power_right,col="darkgreen",type="l",lwd=1.5)
lines(mu,power_both,col="red",type="l",lwd=1.5)
abline(v=mu_0,lty=2,col="gray",lwd=1.5)
text(5.5,0.4,labels=expression(mu == 5))
abline(h=alpha,lty=2,col="gray",lwd=1.5)
text(7.5,0.1,labels=expression(alpha == 0.05))
legend("top",c("Left-sided","Right-sided","Both-sided"),
       col=c("blue","darkgreen","red"),lwd=1.5)


# phi_left has more power against H_left
# phi_right has more power against H_right
# phi_both has more power against H_both


##########################################################
##########################################################
##########################################################

##### (e) #####
n <- 25
sigma_0 <- 10
alpha <- 0.05

c_left <- sigma_0*sqrt(n)*qnorm(alpha)
print(c_left)

beta_left <- function(sigma){ # power function of the left-sided test
  pnorm(c_left/(sqrt(n)*sigma))
}
beta_left(sigma_0) # size

curve(beta_left, from=1, to=20, frame=FALSE)

c_right <- sigma_0*sqrt(n)*qnorm(1-alpha)
print(c_right)

beta_right <- function(sigma){ # power function of the right-tailed test
  1 - pnorm(c_right/(sqrt(n)*sigma))
}
beta_right(sigma_0) #size

curve(beta_right, from=1, to=20, frame=FALSE)

alpha1 <- alpha/2
alpha2 <- alpha/2
c1 <- sigma_0*sqrt(n)*qnorm(alpha1)
c2 <- sigma_0*sqrt(n)*qnorm(1-alpha2)
print(c(c1,c2))

beta_both <- function(sigma){ #power function of the two-sided test
  pnorm(c1/(sqrt(n)*sigma)) + 1 - pnorm(c2/(sqrt(n)*sigma))
}
beta_both(sigma_0) #size

curve(beta_both, from=1, to=20, frame=FALSE)

sigma <- seq(0.1,30,,100)
power_left <- sapply(sigma,beta_left)
power_right <- sapply(sigma,beta_right)
power_both <- sapply(sigma,beta_both)

plot(sigma,power_left,col="blue",type="l",lwd=1.5,ylim=c(0,1),
     frame=FALSE,xlab=expression(sigma),ylab="Power",
     main="Power functions")
lines(sigma,power_right,col="darkgreen",type="l",lwd=1.5)
lines(sigma,power_both,col="red",type="l",lwd=1.5)
abline(v=sigma_0,lty=2,col="gray",lwd=1.5)
text(7.5,1,labels=expression(mu == 5))
abline(h=alpha,lty=2,col="gray",lwd=1.5)
text(28,0.1,labels=expression(alpha == 0.05))
legend("topright",c("Left-sided","Right-sided","Both-sided"),
       col=c("blue","darkgreen","red"),lwd=1.5)


# powers of phi_left and phi_right are the same
# phi_both has more power compared to the others
# none is suitable against H_left